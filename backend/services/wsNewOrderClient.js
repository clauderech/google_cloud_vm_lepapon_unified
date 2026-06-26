// wsNewOrderClient.js
// Cliente WebSocket para escutar eventos "new_order" do LePapon
// Uso: node wsNewOrderClient.js ou importe como módulo

const WebSocket = require('ws');
const path = require('path');
const ComandaModel = require(path.join(__dirname, '../models/comanda'));
const CustomerModel = require(path.join(__dirname, '../models/customer'));
const ProductModel = require(path.join(__dirname, '../models/product'));
const CozinhaItem = require(path.join(__dirname, '../models/cozinha_item'));
const StockService = require(path.join(__dirname, './stockService'));

const WS_URL = process.env.LEPAPON_WS_URL || 'ws://lepapon.com.br/ws';
const TOKEN = process.env.LEPAPON_WS_TOKEN || 'SEU_TOKEN_AQUI';
const RECONNECT_DELAY = 5000; // ms

// Helper para gerenciar itens do tipo 'prato' na cozinha
// Usa função centralizada para evitar duplicações
async function sendPratosToKitchen(items, comandaId) {
  try {
    console.log(`[WS][COZINHA] Gerenciando itens da cozinha para comanda ${comandaId}`);
    const results = await CozinhaItem.manageCozinhaItems(comandaId, items, null);
    console.log(`[WS][COZINHA] Operações realizadas:`, results);
  } catch (error) {
    console.error('[WS][COZINHA][ERROR]', { error: error.message, comandaId });
  }
}

function createWebSocketClient() {
  let ws;
  let reconnectTimeout;

  async function handleNewOrder(msg) {
    try {
      const sessionId = msg.data?.session_id;
      const novo = msg.data?.novo;
      if (!sessionId || !novo) {
        console.warn('[WS] Payload new_order incompleto:', msg);
        return;
      }
      // Buscar cliente pelo telefone
      let customer = null;
      console.log('[WS] Buscando cliente para telefone:', sessionId);
      try {
        customer = await CustomerModel.findByPhone(sessionId);
        console.log('[WS] Cliente encontrado:', customer.nome, 'ID:', customer.id);
      } catch (e) {
        // Se não existir, segue sem customer
      }
      const customer_id = customer ? customer.id : null;
      const customer_name = customer ? customer.nome : (novo.itensPedido?.[0]?.nome_cliente || '');
      const total = novo.valorTotal || 0;
      const opened_at = formatDateForMySQL(novo.timestamp || new Date());
      const notes = novo.itensPedido?.[0]?.Obs || '';
      // Montar itens (buscar nome do produto se necessário)
      const items = [];
      for (const item of (novo.itensPedido || [])) {
        let productName = null;
        let price = null;
        try {
            const productId = String(item.id);
            const product = await ProductModel.getById(productId);
            if (product) {
            console.log('[WS] Produto encontrado no banco:', product);
                productName = product.name;
                price = product.price;
            }
        } catch (e) {
          console.warn('[WS] Produto não encontrado no banco:', productId);
            // Se não encontrar, deixa vazio
        }
        items.push({
          product_id: item.id,
          product_name: productName,
          quantity: item.Qtde,
          unit_price: price,
          notes: item.Obs || null,
          status: 'pending'
        });
      }
      // Verificar se já existe comanda aberta ou fechada recente para o mesmo telefone
      const recentComanda = await ComandaModel.findRecentByFone(sessionId, 10);
      let comandaId;
      if (recentComanda) {
        if (recentComanda.status === 'open') {
          // Se aberta, só adiciona os itens
          comandaId = recentComanda.id;
          await ComandaModel.addItems(comandaId, items);
          
          // Descontar estoque imediatamente
          try {
            await StockService.processComanda({
              items: items,
              comandaId: comandaId,
              userId: null
            });
            console.log(`[WS][STOCK] Estoque descontado para comanda ${comandaId}`);
          } catch (stockError) {
            console.error('[WS][STOCK][ERROR]', { error: stockError.message, comandaId });
          }
          
          // Enviar pratos para cozinha
          await sendPratosToKitchen(items, comandaId);
          console.log(`[WS] Itens adicionados à comanda aberta existente para telefone ${sessionId} (comandaId: ${comandaId})`);
          return;
        } else if (recentComanda.status === 'closed') {
          // Se fechada, mas updated_at < 10h, reabrir e adicionar itens
          comandaId = recentComanda.id;
          await ComandaModel.update(comandaId, { status: 'open', opened_at: opened_at });
          await ComandaModel.addItems(comandaId, items);
          
          // Descontar estoque imediatamente
          try {
            await StockService.processComanda({
              items: items,
              comandaId: comandaId,
              userId: null
            });
            console.log(`[WS][STOCK] Estoque descontado para comanda reaberta ${comandaId}`);
          } catch (stockError) {
            console.error('[WS][STOCK][ERROR]', { error: stockError.message, comandaId });
          }
          
          // Enviar pratos para cozinha
          await sendPratosToKitchen(items, comandaId);
          console.log(`[WS] Comanda reaberta e itens adicionados para telefone ${sessionId} (comandaId: ${comandaId})`);
          return;
        }
      }
      // Caso não exista comanda recente, criar nova
      comandaId = `comanda_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      const comandaPayload = {
        id: comandaId,
        customer_id,
        customer_name,
        customer_fone: sessionId,
        total,
        status: 'open',
        opened_at,
        notes
      };
      const [createdId] = await ComandaModel.create(comandaPayload);
      await ComandaModel.addItems(comandaId, items);
      
      // Descontar estoque imediatamente
      try {
        await StockService.processComanda({
          items: items,
          comandaId: comandaId,
          userId: null
        });
        console.log(`[WS][STOCK] Estoque descontado para nova comanda ${comandaId}`);
      } catch (stockError) {
        console.error('[WS][STOCK][ERROR]', { error: stockError.message, comandaId });
      }
      
      // Enviar pratos para cozinha
      await sendPratosToKitchen(items, comandaId);
      console.log(`[WS] Nova comanda criada para telefone ${sessionId} (comandaId: ${comandaId})`);
    } catch (err) {
      console.error('[WS] Erro ao criar comanda via new_order:', err.message, err.stack);
    }
  }

  function connect() {
    const url = `${WS_URL}?token=${TOKEN}`;
    console.log(`[WS] Conectando ao endpoint new_order: ${WS_URL}`);
    ws = new WebSocket(url);

    ws.on('open', () => {
      console.log(`[WS] Conectado a ${url}`);
    });

    ws.on('close', (code, reason) => {
      console.warn(`[WS] Conexão fechada (${code}): ${reason}`);
      scheduleReconnect();
    });

    ws.on('error', (err) => {
      console.error('[WS] Erro:', err.message);
      ws.close();
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.event === 'custom_message' && msg.data && msg.data.session_id) {
          console.log(`[WS] Novo pedido recebido! session_id: ${msg.data.session_id}`);
          handleNewOrder(msg);
        } else {
          // Ignora outros eventos
        }
      } catch (e) {
        console.error('[WS] Erro ao parsear mensagem:', e.message);
      }
    });
  }

  function scheduleReconnect() {
    if (reconnectTimeout) return;
    console.log(`[WS] Tentando reconectar em ${RECONNECT_DELAY / 1000}s...`);
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, RECONNECT_DELAY);
  }

  connect();
}

// Se rodar diretamente, inicia o cliente
if (require.main === module) {
  createWebSocketClient();
}

module.exports = { createWebSocketClient };

function formatDateForMySQL(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}