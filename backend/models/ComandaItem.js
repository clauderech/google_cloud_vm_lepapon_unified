'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);

/**
 * Model: ComandaItem
 * Itens dentro de uma comanda
 */

class ComandaItem {
  /**
   * Adicionar item à comanda
   */
  static async create(data) {
    const [id] = await db('comanda_items').insert({
      comanda_id: data.comandaId,
      product_id: data.productId,
      product_name: data.productName,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      status: data.status || 'pending',
      notes: data.notes,
    });

    return this.findById(id);
  }

  /**
   * Buscar item por ID
   */
  static async findById(id) {
    return db('comanda_items')
      .where('id', id)
      .first();
  }

  /**
   * Listar itens de uma comanda
   */
  static async listByComanda(comandaId) {
    return db('comanda_items')
      .where('comanda_id', comandaId)
      .orderBy('created_at', 'asc');
  }

  /**
   * Listar itens por status
   */
  static async listByStatus(comandaId, status) {
    return db('comanda_items')
      .where('comanda_id', comandaId)
      .where('status', status);
  }

  /**
   * Atualizar item
   */
  static async update(id, data) {
    const updateData = {};

    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;
    if (data.status) updateData.status = data.status;
    if (data.notes) updateData.notes = data.notes;

    updateData.updated_at = db.fn.now();

    await db('comanda_items')
      .where('id', id)
      .update(updateData);

    return this.findById(id);
  }

  /**
   * Mudar status do item (pending -> preparing -> ready -> delivered)
   */
  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  /**
   * Remover item da comanda
   */
  static async delete(id) {
    return db('comanda_items')
      .where('id', id)
      .del();
  }

  /**
   * Remover todos os itens de uma comanda
   */
  static async deleteByComanda(comandaId) {
    return db('comanda_items')
      .where('comanda_id', comandaId)
      .del();
  }

  /**
   * Contar itens pendentes de preparo
   */
  static async countPending(comandaId) {
    const result = await db('comanda_items')
      .where('comanda_id', comandaId)
      .whereIn('status', ['pending', 'preparing'])
      .count('id as count')
      .first();

    return result?.count || 0;
  }

  /**
   * Contar itens entregues
   */
  static async countDelivered(comandaId) {
    const result = await db('comanda_items')
      .where('comanda_id', comandaId)
      .where('status', 'delivered')
      .count('id as count')
      .first();

    return result?.count || 0;
  }
}

module.exports = ComandaItem;
