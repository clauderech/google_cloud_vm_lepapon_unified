// wsNewOrderClient.js
// Cliente WebSocket para escutar eventos "new_order" do LePapon
// Uso: node wsNewOrderClient.js ou importe como módulo

const WebSocket = require('ws');
const path = require('path');
const ComandaModel = require(path.join(__dirname, '../models/comanda'));
const CustomerModel = require(path.join(__dirname, '../models/customer'));

const WS_URL = process.env.LEPAPON_WS_URL || 'ws://lepapon.com.br:3001';
const TOKEN = process.env.LEPAPON_WS_TOKEN || 'SEU_TOKEN_AQUI';
const RECONNECT_DELAY = 5000; // ms

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
      try {
        customer = await CustomerModel.findByPhone(sessionId);
      } catch (e) {
        // Se não existir, segue sem customer
      }
      const customer_id = customer ? customer.id : null;
      const customer_name = customer ? customer.nome : (novo.itensPedido?.[0]?.nome_cliente || '');
      const total = novo.valorTotal || 0;
      const opened_at = formatDateForMySQL(novo.timestamp || new Date());
      const notes = novo.itensPedido?.[0]?.Obs || '';
      // Montar itens
      const items = (novo.itensPedido || []).map(item => ({
        product_id: item.id,
        product_name: item.nome_produto || null,
        quantity: item.Qtde,
        unit_price: null,
        notes: item.Obs || null,
        status: 'pending'
      }));
      // Gerar id único para a comanda
      const comandaId = `comanda_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      // Criar comanda
      const comandaPayload = {
        id: comandaId,
        customer_id,
        customer_name,
        total,
        status: 'open',
        opened_at,
        notes
      };
      const [createdId] = await ComandaModel.create(comandaPayload);
      await ComandaModel.addItems(comandaId, items);
      console.log(`[WS] Comanda criada automaticamente para telefone ${sessionId} (comandaId: ${comandaId})`);
    } catch (err) {
      console.error('[WS] Erro ao criar comanda via new_order:', err.message, err.stack);
    }
  }

  function connect() {
    const url = `${WS_URL}?token=${TOKEN}`;
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