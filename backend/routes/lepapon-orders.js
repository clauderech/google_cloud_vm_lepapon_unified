'use strict';

const express = require('express');
const router = express.Router();

/**
 * Rotas para gerenciar pedidos LePapon
 * GET  /api/lepapon-orders - Listar pedidos LePapon pendentes
 * PUT  /api/lepapon-orders/:orderId - Atualizar status do pedido
 */

/**
 * GET /api/lepapon-orders
 * Retorna lista de pedidos LePapon (ou apenas status=pending)
 * 
 * Query params:
 *   - status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
 *   - since: timestamp (retorna apenas pedidos criados após este timestamp)
 *   - limit: número de pedidos (default: 50)
 */
router.get('/api/lepapon-orders', async (req, res) => {
  try {
    const db = req.db;
    const status = req.query.status || 'pending';
    const since = req.query.since ? parseInt(req.query.since) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;

    let query = db('whatsapp_orders')
      .leftJoin('customers', 'whatsapp_orders.customer_id', 'customers.id')
      .select(
        'whatsapp_orders.id',
        'whatsapp_orders.order_number',
        'whatsapp_orders.lepapon_order_id',
        'whatsapp_orders.lepapon_session_id',
        'whatsapp_orders.status as order_status',
        'whatsapp_orders.payment_type as payment_status',
        'whatsapp_orders.total_amount as total',
        'whatsapp_orders.created_at',
        'whatsapp_orders.updated_at',
        'customers.nome',
        'customers.sobrenome',
        'customers.fone'
      )
      .where('whatsapp_orders.source', 'lepapon');

    // Filtrar por status se especificado
    if (status && status !== 'all') {
      query = query.where('whatsapp_orders.status', status);
    }

    // Filtrar por data (apenas pedidos recentes)
    if (since) {
      const sinceDate = new Date(since);
      query = query.where('whatsapp_orders.created_at', '>=', sinceDate);
    }

    // Aplicar limite e ordenar por mais recente
    const orders = await query
      .orderBy('whatsapp_orders.created_at', 'desc')
      .limit(limit);

    // Buscar itens de cada pedido
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db('whatsapp_order_items')
          .where('order_id', order.id)
          .select('product_retailer_id', 'quantity', 'unit_price', 'total_price');

        // Formatar como Comanda para frontend
        const customerName = order.nome 
          ? `${order.nome}${order.sobrenome ? ' ' + order.sobrenome : ''}`
          : order.lepapon_session_id;
        
        return {
          id: order.id,
          order_id: order.id,
          customerName: customerName,
          lepapon_session_id: order.lepapon_session_id,
          lepapon_order_id: order.lepapon_order_id,
          items: items.map(item => ({
            productId: item.product_retailer_id,
            productName: `Produto ${item.product_retailer_id}`,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            totalPrice: item.total_price
          })),
          subtotal: 0,
          discount: 0,
          total: order.total,
          status: 'open', // Comanda sempre em "open" quando não confirmada
          paymentStatus: order.payment_status,
          orderStatus: order.order_status,
          source: 'lepapon',
          created_at: order.created_at,
          updated_at: order.updated_at
        };
      })
    );

    res.json({
      success: true,
      count: ordersWithItems.length,
      data: ordersWithItems
    });

  } catch (error) {
    console.error('[API] Erro ao listar pedidos LePapon:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar pedidos',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/lepapon-orders/:orderId
 * Atualiza status de um pedido LePapon
 * 
 * Body:
 *   - status: 'pending' | 'confirmed' | 'processing' | 'ready' | 'delivered' | 'completed' | 'cancelled'
 *   - payment_status: 'pending' | 'approved' | 'rejected' | 'refunded'
 *   - payment_type: 'cash' | 'card' | 'pix' | 'credit'
 */
router.put('/api/lepapon-orders/:orderId', async (req, res) => {
  try {
    const db = req.db;
    const orderId = parseInt(req.params.orderId);
    const { status, payment_status, payment_type } = req.body;

    // Validar que orderId é número válido
    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'orderId inválido'
      });
    }

    // Validar que pedido existe e é LePapon
    const order = await db('whatsapp_orders')
      .where('id', orderId)
      .where('source', 'lepapon')
      .first();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Pedido LePapon não encontrado'
      });
    }

    // Preparar update
    const updateData = {
      updated_at: db.fn.now()
    };

    if (status) {
      updateData.status = status;
    }

    if (payment_status) {
      updateData.payment_type = payment_status;
    }

    if (payment_type) {
      updateData.payment_type = payment_type;
    }

    // Executar update
    await db('whatsapp_orders')
      .where('id', orderId)
      .update(updateData);

    // Buscar pedido atualizado
    const updatedOrder = await db('whatsapp_orders')
      .where('id', orderId)
      .first();

    // Buscar itens
    const items = await db('whatsapp_order_items')
      .where('order_id', orderId)
      .select('product_retailer_id', 'quantity', 'unit_price', 'total_price');

    console.log(`[API] Pedido LePapon atualizado. ID: ${orderId}, Status: ${status}`);

    res.json({
      success: true,
      message: 'Pedido atualizado com sucesso',
      data: {
        id: updatedOrder.id,
        order_status: updatedOrder.status,
        payment_status: updatedOrder.payment_type,
        payment_type: updatedOrder.payment_type,
        updated_at: updatedOrder.updated_at
      }
    });

  } catch (error) {
    console.error('[API] Erro ao atualizar pedido LePapon:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar pedido',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
