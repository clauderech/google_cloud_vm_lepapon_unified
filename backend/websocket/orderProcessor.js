'use strict';

/**
 * OrderProcessor - Processa eventos new_order do WebSocket LePapon
 */
class OrderProcessor {
  constructor(options = {}) {
    this.db = options.db;
    this.broadcaster = options.broadcaster;
    this.asyncQueue = options.asyncQueue;
    this.logger = options.logger || console;
  }

  /**
   * Processa evento new_order do LePapon
   * Exemplo de payload:
   * {
   *   event: "new_order",
   *   type: "custom_payload",
   *   timestamp: "2026-01-13T16:27:40.615Z",
   *   data: {
   *     session_id: "555496860055",
   *     novo: {
   *       tipo: "novo_pedido",
   *       pedidosIds: [789],
   *       itensPedido: [{
   *         nome_cliente: "Claudemir",
   *         Obs: "Completo",
   *         Qtde: 1,
   *         id: 10101
   *       }],
   *       valorTotal: 22,
   *       timestamp: "2026-01-13T16:27:40.615Z"
   *     }
   *   }
   * }
   */
  async processNewOrder(payload) {
    try {
      if (!payload || !payload.data || !payload.data.novo) {
        throw new Error('Payload inválido: estrutura esperada data.novo');
      }

      const { session_id } = payload.data;
      const { novo } = payload.data;

      // Validações
      if (!session_id) {
        throw new Error('session_id ausente');
      }
      if (!novo.pedidosIds || novo.pedidosIds.length === 0) {
        throw new Error('pedidosIds ausente ou vazio');
      }
      if (!novo.itensPedido || novo.itensPedido.length === 0) {
        throw new Error('itensPedido ausente ou vazio');
      }

      const orderId = novo.pedidosIds[0];
      const valorTotal = novo.valorTotal || 0;
      const items = novo.itensPedido || [];

      this.logger.info(`[OrderProcessor] Processando novo pedido. Order: ${orderId}, Session: ${session_id}, Total: ${valorTotal}`);

      // Enfileirar processamento para não bloquear WebSocket
      if (this.asyncQueue) {
        const accepted = this.asyncQueue.enqueue(async () => {
          await this.persistOrderFromLepapon({
            session_id,
            orderId,
            items,
            valorTotal,
            timestamp: novo.timestamp || payload.timestamp || new Date().toISOString()
          });
        });

        if (!accepted.accepted) {
          this.logger.warn(`[OrderProcessor] Fila cheia. Tamanho: ${accepted.size}, Em execução: ${accepted.running}`);
          throw new Error('Fila de processamento cheia');
        }

        this.logger.debug(`[OrderProcessor] Pedido enfileirado. Tamanho da fila: ${accepted.size}`);
      } else {
        // Se sem queue, processar diretamente
        await this.persistOrderFromLepapon({
          session_id,
          orderId,
          items,
          valorTotal,
          timestamp: novo.timestamp || payload.timestamp || new Date().toISOString()
        });
      }

      return { accepted: true, orderId };
    } catch (error) {
      this.logger.error('[OrderProcessor] Erro ao processar novo pedido:', error.message);
      throw error;
    }
  }

  /**
   * Persiste pedido do LePapon no banco de dados
   */
  async persistOrderFromLepapon(orderData) {
    try {
      const {
        session_id,
        orderId,
        items,
        valorTotal,
        timestamp
      } = orderData;

      // Extrair nome do cliente do primeiro item (se disponível)
      const customerInfo = items && items.length > 0 && items[0].nome_cliente 
        ? { nome_cliente: items[0].nome_cliente }
        : {};

      // 1. Buscar ou criar cliente na tabela customers
      let customerId = await this.findOrCreateCustomerBySession(session_id, customerInfo);

      // 2. Criar pedido em whatsapp_orders
      const orderNumber = `LEP-${orderId}-${Date.now()}`;
      
      const insertedOrder = await this.db('whatsapp_orders').insert({
        user_id: null,  // Não usar mais whatsapp_users
        customer_id: customerId,  // Usar tabela customers
        order_number: orderNumber,
        lepapon_order_id: orderId,
        lepapon_session_id: session_id,
        source: 'lepapon',
        
        delivery_type: 'pickup', // Padrão para pedidos LePapon (pode ser ajustado depois)
        order_status: 'pending',  // Status inicial
        payment_status: 'pending',
        payment_type: null,        // Será preenchido depois
        
        subtotal: valorTotal,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: valorTotal,
        
        customer_notes: null,
        internal_notes: `Pedido recebido via LePapon WebSocket em ${timestamp}`,
        
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      });

      const insertedOrderId = Array.isArray(insertedOrder) 
        ? insertedOrder[0] 
        : insertedOrder;

      this.logger.info(`[OrderProcessor] Pedido criado no BD. Order ID: ${insertedOrderId}, LePapon Order: ${orderId}`);

      // 3. Inserir itens do pedido
      const orderItems = items.map(item => ({
        order_id: insertedOrderId,
        product_retailer_id: String(item.id || item.product_id || 'unknown'),
        quantity: item.Qtde || item.quantity || 1,
        unit_price: item.unit_price || item.preco || 0,
        total_price: (item.Qtde || item.quantity || 1) * (item.unit_price || item.preco || 0),
        created_at: this.db.fn.now()
      }));

      if (orderItems.length > 0) {
        await this.db('whatsapp_order_items').insert(orderItems);
        this.logger.info(`[OrderProcessor] ${orderItems.length} itens inseridos para order ${insertedOrderId}`);
      }

      // 4. Notificar frontend via WebSocket
      if (this.broadcaster) {
        this.broadcaster.broadcastNewOrder(insertedOrderId, {
          lepapon_order_id: orderId,
          session_id,
          total: valorTotal,
          items_count: items.length
        });
      }

      return {
        success: true,
        orderId: insertedOrderId,
        lepapon_order_id: orderId,
        session_id
      };
    } catch (error) {
      this.logger.error('[OrderProcessor] Erro ao persistir pedido:', error.message);
      throw error;
    }
  }

  /**
   * Busca ou cria cliente na tabela customers baseado em session_id
   * @param {string} sessionId - ID da sessão LePapon (usado como fone)
   * @param {Object} customerInfo - Informações do cliente (nome_cliente, etc)
   */
  async findOrCreateCustomerBySession(sessionId, customerInfo = {}) {
    try {
      // Buscar cliente existente pelo telefone (session_id)
      const existingCustomer = await this.db('customers')
        .where('fone', sessionId)
        .first();

      if (existingCustomer) {
        // Se cliente existe mas não tem sobrenome, atualizar com info do pedido
        if (customerInfo.nome_cliente && !existingCustomer.sobrenome) {
          const nameParts = customerInfo.nome_cliente.trim().split(/\s+/);
          await this.db('customers')
            .where('id', existingCustomer.id)
            .update({
              nome: nameParts[0],
              sobrenome: nameParts.slice(1).join(' ') || null,
              updated_at: this.db.fn.now()
            });
          this.logger.debug(`[OrderProcessor] Nome do cliente atualizado. ID: ${existingCustomer.id}`);
        }
        
        this.logger.debug(`[OrderProcessor] Cliente encontrado. ID: ${existingCustomer.id}, Session: ${sessionId}`);
        return existingCustomer.id;
      }

      // Criar novo cliente
      const nameParts = customerInfo.nome_cliente ? customerInfo.nome_cliente.trim().split(/\s+/) : ['Cliente'];
      const customerId = `LEP-${sessionId}-${Date.now()}`;
      
      const newCustomer = {
        id: customerId,
        nome: nameParts[0],
        sobrenome: nameParts.slice(1).join(' ') || null,
        fone: sessionId,
        loyalty_points: 0,
        created_at: this.db.fn.now(),
        updated_at: this.db.fn.now()
      };

      await this.db('customers').insert(newCustomer);

      this.logger.info(`[OrderProcessor] Novo cliente criado. ID: ${customerId}, Session: ${sessionId}, Nome: ${customerInfo.nome_cliente || 'N/A'}`);

      return customerId;
    } catch (error) {
      this.logger.error('[OrderProcessor] Erro ao buscar/criar cliente:', error.message);
      throw error;
    }
  }
}

module.exports = OrderProcessor;
