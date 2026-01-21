'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);
const crypto = require('crypto');

/**
 * Model: Comanda
 * Pedidos abertos em PDV ou via LePapon (WhatsApp)
 */

class Comanda {
  /**
   * Gerar UUID
   */
  static generateId() {
    return crypto.randomUUID();
  }

  /**
   * Criar nova comanda
   */
  static async create(data) {
    const id = this.generateId();

    await db('comandas').insert({
      id,
      customer_id: data.customerId,
      customer_name: data.customerName,
      table_number: data.tableNumber,
      total: data.total || 0,
      status: data.status || 'open',
      payment_method: data.paymentMethod,
      source: data.source || 'pos',
      lepapon_session_id: data.lepaponSessionId,
      lepapon_order_id: data.lepaponOrderId,
      order_status: data.orderStatus,
      payment_status: data.paymentStatus,
      notes: data.notes,
    });

    return this.findById(id);
  }

  /**
   * Buscar comanda por ID
   */
  static async findById(id) {
    const comanda = await db('comandas')
      .where('id', id)
      .first();

    if (comanda) {
      comanda.items = await db('comanda_items').where('comanda_id', id);
    }

    return comanda;
  }

  /**
   * Listar comandas com filtros
   */
  static async list(filters = {}) {
    let query = db('comandas');

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.source) {
      query = query.where('source', filters.source);
    }

    if (filters.customerId) {
      query = query.where('customer_id', filters.customerId);
    }

    if (filters.tableNumber) {
      query = query.where('table_number', filters.tableNumber);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    // Ordenar por data descendente
    query = query.orderBy('opened_at', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const comandas = await query;

    // Buscar itens para cada comanda
    for (const comanda of comandas) {
      comanda.items = await db('comanda_items').where('comanda_id', comanda.id);
    }

    return comandas;
  }

  /**
   * Listar apenas comandas abertas
   */
  static async listOpen(source = null) {
    let query = db('comandas').where('status', 'open');

    if (source) {
      query = query.where('source', source);
    }

    query = query.orderBy('opened_at', 'asc');

    const comandas = await query;

    for (const comanda of comandas) {
      comanda.items = await db('comanda_items').where('comanda_id', comanda.id);
    }

    return comandas;
  }

  /**
   * Atualizar comanda
   */
  static async update(id, data) {
    const updateData = {};

    if (data.customerId !== undefined) updateData.customer_id = data.customerId;
    if (data.customerName) updateData.customer_name = data.customerName;
    if (data.tableNumber) updateData.table_number = data.tableNumber;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.status) updateData.status = data.status;
    if (data.paymentMethod) updateData.payment_method = data.paymentMethod;
    if (data.orderStatus) updateData.order_status = data.orderStatus;
    if (data.paymentStatus) updateData.payment_status = data.paymentStatus;
    if (data.notes) updateData.notes = data.notes;

    updateData.updated_at = db.fn.now();

    await db('comandas')
      .where('id', id)
      .update(updateData);

    return this.findById(id);
  }

  /**
   * Fechar comanda (marcar como closed)
   */
  static async close(id) {
    return this.update(id, {
      status: 'closed',
      closed_at: new Date(),
    });
  }

  /**
   * Cancelar comanda
   */
  static async cancel(id) {
    return this.update(id, {
      status: 'cancelled',
      closed_at: new Date(),
    });
  }

  /**
   * Deletar comanda (apenas abertas)
   */
  static async delete(id) {
    // Remover itens primeiro
    await db('comanda_items').where('comanda_id', id).del();

    return db('comandas')
      .where('id', id)
      .del();
  }

  /**
   * Calcular total da comanda
   */
  static async calculateTotal(id) {
    const items = await db('comanda_items')
      .where('comanda_id', id)
      .select(db.raw('SUM(quantity * unit_price) as total'));

    const total = items[0]?.total || 0;

    await db('comandas')
      .where('id', id)
      .update({ total });

    return total;
  }
}

module.exports = Comanda;
