const ComandaModel = {
  async list() {
    // Retorna todas as comandas
    return db('comandas').select('*');
  },
  async getById(id) {
    return db('comandas').where({ id }).first();
  },
  async create(data) {
    return db('comandas').insert(data);
  },
  async update(id, data) {
    return db('comandas').where({ id }).update(data);
  },
  async remove(id) {
    return db('comandas').where({ id }).del();
  },
  async getItems(comandaId) {
    return db('comanda_items').where({ comanda_id: comandaId }).select('*');
  },
  async clearItems(comandaId) {
    return db('comanda_items').where({ comanda_id: comandaId }).del();
  },
  async addItems(comandaId, items) {
    if (!Array.isArray(items) || items.length === 0) return;
    // Mapeia os itens para o formato correto
    const mapped = items.map(item => ({
      comanda_id: comandaId,
      product_id: item.productId || item.product_id,
      product_name: item.productName || item.product_name,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.unit_price,
      status: item.status || 'pending',
      notes: item.notes || null
    }));
    return db('comanda_items').insert(mapped);
  },
  async findRecentByFone(customer_fone, maxHours = 10) {
    // Busca comanda do mesmo telefone atualizada há menos de maxHours
    const now = new Date();
    const cutoff = new Date(now.getTime() - maxHours * 60 * 60 * 1000);
    return db('comandas')
      .where({ customer_fone })
      .andWhere('updated_at', '>=', cutoff)
      .orderBy('updated_at', 'desc')
      .first();
  }
};

module.exports = ComandaModel;
'use strict';

const { db } = require('../config/knex');

const ComandaModel = {
  async list() {
    // Retorna todas as comandas
    return db('comandas').select('*');
  },
  async getById(id) {
    return db('comandas').where({ id }).first();
  },
  async create(data) {
    return db('comandas').insert(data);
  },
  async update(id, data) {
    return db('comandas').where({ id }).update(data);
  },
  async remove(id) {
    return db('comandas').where({ id }).del();
  },
  async getItems(comandaId) {
    return db('comanda_items').where({ comanda_id: comandaId }).select('*');
  }
  ,
  async clearItems(comandaId) {
    return db('comanda_items').where({ comanda_id: comandaId }).del();
  },
  async addItems(comandaId, items) {
    if (!Array.isArray(items) || items.length === 0) return;
    // Mapeia os itens para o formato correto
    const mapped = items.map(item => ({
      comanda_id: comandaId,
      product_id: item.productId || item.product_id,
      product_name: item.productName || item.product_name,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.unit_price,
      status: item.status || 'pending',
      notes: item.notes || null
    }));
    return db('comanda_items').insert(mapped);
  }
};

module.exports = ComandaModel;
