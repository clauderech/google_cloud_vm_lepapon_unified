'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);

/**
 * Model: StockMovement
 * Rastreia movimentações de estoque (entrada, saída, ajuste, perda, devolução)
 */

class StockMovement {
  /**
   * Criar novo movimento de estoque
   */
  static async create(data) {
    const [id] = await db('stock_movements').insert({
      product_id: data.productId,
      movement_type: data.movementType,
      quantity: data.quantity,
      previous_stock: data.previousStock,
      new_stock: data.newStock,
      reference_type: data.referenceType,
      reference_id: data.referenceId,
      cost_impact: data.costImpact,
      notes: data.notes,
      created_by: data.createdBy,
    });

    return this.findById(id);
  }

  /**
   * Buscar movimento por ID
   */
  static async findById(id) {
    return db('stock_movements')
      .where('id', id)
      .first();
  }

  /**
   * Listar movimentos com filtros
   */
  static async list(filters = {}) {
    let query = db('stock_movements');

    if (filters.productId) {
      query = query.where('product_id', filters.productId);
    }

    if (filters.movementType) {
      query = query.where('movement_type', filters.movementType);
    }

    if (filters.referenceType) {
      query = query.where('reference_type', filters.referenceType);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    // Ordenar por data descendente
    query = query.orderBy('created_at', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  /**
   * Obter resumo de estoque por produto
   */
  static async getStockSummary(productId) {
    const movements = await db('stock_movements')
      .where('product_id', productId)
      .orderBy('created_at', 'asc');

    let totalQuantity = 0;
    movements.forEach(m => {
      totalQuantity += parseFloat(m.quantity);
    });

    return {
      productId,
      totalQuantity,
      lastMovement: movements[movements.length - 1] || null,
      movementCount: movements.length,
    };
  }

  /**
   * Atualizar movimento
   */
  static async update(id, data) {
    await db('stock_movements')
      .where('id', id)
      .update({
        movement_type: data.movementType,
        quantity: data.quantity,
        previous_stock: data.previousStock,
        new_stock: data.newStock,
        reference_type: data.referenceType,
        reference_id: data.referenceId,
        cost_impact: data.costImpact,
        notes: data.notes,
      });

    return this.findById(id);
  }

  /**
   * Deletar movimento
   */
  static async delete(id) {
    return db('stock_movements')
      .where('id', id)
      .del();
  }
}

module.exports = StockMovement;
