'use strict';

const knex = require('../config/knex').buildKnexConfig();
const db = require('knex')(knex);

/**
 * Model: LoyaltyTransaction
 * Transações de fidelidade (ganho e resgate de pontos)
 */

class LoyaltyTransaction {
  /**
   * Criar nova transação
   */
  static async create(data) {
    const [id] = await db('loyalty_transactions').insert({
      customer_id: data.customerId,
      points_change: data.pointsChange,
      transaction_type: data.transactionType,
      reference_id: data.referenceId,
      notes: data.notes,
      created_by: data.createdBy,
    });

    return this.findById(id);
  }

  /**
   * Buscar transação por ID
   */
  static async findById(id) {
    return db('loyalty_transactions')
      .where('id', id)
      .first();
  }

  /**
   * Listar transações de um cliente
   */
  static async listByCustomer(customerId, filters = {}) {
    let query = db('loyalty_transactions')
      .where('customer_id', customerId);

    if (filters.transactionType) {
      query = query.where('transaction_type', filters.transactionType);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', filters.endDate);
    }

    query = query.orderBy('created_at', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query;
  }

  /**
   * Obter saldo de pontos de um cliente
   */
  static async getBalance(customerId) {
    const result = await db('loyalty_transactions')
      .where('customer_id', customerId)
      .select(db.raw('SUM(points_change) as total_points'))
      .first();

    return result?.total_points || 0;
  }

  /**
   * Registrar ganho de pontos (após compra)
   */
  static async addPoints(customerId, points, referenceId = null) {
    return this.create({
      customerId,
      pointsChange: Math.abs(points), // Garantir positivo
      transactionType: 'purchase',
      referenceId,
    });
  }

  /**
   * Registrar resgate de pontos
   */
  static async redeemPoints(customerId, points, referenceId = null) {
    const balance = await this.getBalance(customerId);

    if (balance < points) {
      return { success: false, error: 'Insufficient points balance' };
    }

    const result = await this.create({
      customerId,
      pointsChange: -Math.abs(points), // Negativo para resgate
      transactionType: 'reward_redeemed',
      referenceId,
    });

    return { success: true, transaction: result };
  }

  /**
   * Ajuste manual de pontos
   */
  static async adjustPoints(customerId, points, notes = '') {
    return this.create({
      customerId,
      pointsChange: points,
      transactionType: 'manual_adjustment',
      notes,
      createdBy: 'admin',
    });
  }

  /**
   * Expirar pontos antigos
   */
  static async expireOldPoints(customerId, daysBefore = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

    // Buscar transações antigas que ainda estão ativas
    const oldTransactions = await db('loyalty_transactions')
      .where('customer_id', customerId)
      .where('transaction_type', '!=', 'reward_redeemed')
      .where('created_at', '<', cutoffDate);

    let totalExpired = 0;

    for (const tx of oldTransactions) {
      totalExpired += tx.points_change;
    }

    if (totalExpired > 0) {
      return this.create({
        customerId,
        pointsChange: -totalExpired,
        transactionType: 'expired',
        notes: `Points expired after ${daysBefore} days`,
        createdBy: 'system',
      });
    }

    return null;
  }

  /**
   * Listar todas as transações com paginação
   */
  static async list(filters = {}) {
    let query = db('loyalty_transactions')
      .leftJoin('customers', 'loyalty_transactions.customer_id', 'customers.id');

    if (filters.customerId) {
      query = query.where('loyalty_transactions.customer_id', filters.customerId);
    }

    if (filters.transactionType) {
      query = query.where('loyalty_transactions.transaction_type', filters.transactionType);
    }

    if (filters.startDate) {
      query = query.where('loyalty_transactions.created_at', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('loyalty_transactions.created_at', '<=', filters.endDate);
    }

    query = query.orderBy('loyalty_transactions.created_at', 'desc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    return query.select(
      'loyalty_transactions.*',
      'customers.nome as customer_name',
      'customers.fone as customer_phone'
    );
  }

  /**
   * Obter resumo de pontos por cliente
   */
  static async getSummary(customerId) {
    const balance = await this.getBalance(customerId);

    const stats = await db('loyalty_transactions')
      .where('customer_id', customerId)
      .select('transaction_type')
      .count('id as count')
      .groupBy('transaction_type');

    return {
      customerId,
      balance,
      statistics: stats.reduce((acc, s) => {
        acc[s.transaction_type] = s.count;
        return acc;
      }, {}),
    };
  }
}

module.exports = LoyaltyTransaction;
