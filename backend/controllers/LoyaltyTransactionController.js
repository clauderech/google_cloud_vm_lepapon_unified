'use strict';

const LoyaltyTransaction = require('../models/LoyaltyTransaction');

/**
 * Controller: LoyaltyTransactionController
 * Gerencia transações de fidelidade
 */

class LoyaltyTransactionController {
  /**
   * POST /api/loyalty-transactions
   * Criar nova transação
   */
  static async create(req, res) {
    try {
      const { customerId, pointsChange, transactionType, referenceId, notes } = req.body;

      if (!customerId || pointsChange === undefined || !transactionType) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: customerId, pointsChange, transactionType',
        });
      }

      const validTypes = ['purchase', 'reward_redeemed', 'manual_adjustment', 'expired'];
      if (!validTypes.includes(transactionType)) {
        return res.status(400).json({
          error: 'INVALID_TRANSACTION_TYPE',
          message: `transactionType deve ser um de: ${validTypes.join(', ')}`,
        });
      }

      const transaction = await LoyaltyTransaction.create({
        customerId,
        pointsChange: parseInt(pointsChange, 10),
        transactionType,
        referenceId,
        notes,
        createdBy: req.user?.id || 'system',
      });

      res.status(201).json({
        success: true,
        message: 'Transação de fidelidade registrada com sucesso',
        data: transaction,
      });
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/loyalty-transactions/:id
   * Obter transação por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const transaction = await LoyaltyTransaction.findById(id);

      if (!transaction) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Transação não encontrada',
        });
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      console.error('Erro ao buscar transação:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/loyalty-transactions/customer/:customerId
   * Listar transações de um cliente
   */
  static async listByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const { transactionType, startDate, endDate, limit = 100 } = req.query;

      const filters = {
        transactionType,
        startDate,
        endDate,
        limit: parseInt(limit, 10),
      };

      const transactions = await LoyaltyTransaction.listByCustomer(customerId, filters);

      res.json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Erro ao listar transações:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/loyalty-transactions/customer/:customerId/balance
   * Obter saldo de pontos de um cliente
   */
  static async getBalance(req, res) {
    try {
      const { customerId } = req.params;

      const balance = await LoyaltyTransaction.getBalance(customerId);
      const summary = await LoyaltyTransaction.getSummary(customerId);

      res.json({
        success: true,
        data: {
          customerId,
          balance,
          ...summary,
        },
      });
    } catch (error) {
      console.error('Erro ao obter saldo:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/loyalty-transactions/customer/:customerId/add-points
   * Adicionar pontos a um cliente
   */
  static async addPoints(req, res) {
    try {
      const { customerId } = req.params;
      const { points, referenceId } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Points deve ser um número positivo',
        });
      }

      const transaction = await LoyaltyTransaction.addPoints(
        customerId,
        parseInt(points, 10),
        referenceId
      );

      res.status(201).json({
        success: true,
        message: 'Pontos adicionados com sucesso',
        data: transaction,
      });
    } catch (error) {
      console.error('Erro ao adicionar pontos:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/loyalty-transactions/customer/:customerId/redeem-points
   * Resgatar pontos
   */
  static async redeemPoints(req, res) {
    try {
      const { customerId } = req.params;
      const { points, referenceId } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Points deve ser um número positivo',
        });
      }

      const result = await LoyaltyTransaction.redeemPoints(
        customerId,
        parseInt(points, 10),
        referenceId
      );

      if (!result.success) {
        return res.status(400).json({
          error: 'REDEMPTION_FAILED',
          message: result.error,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Pontos resgatados com sucesso',
        data: result.transaction,
      });
    } catch (error) {
      console.error('Erro ao resgatar pontos:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/loyalty-transactions/customer/:customerId/adjust-points
   * Ajustar pontos manualmente
   */
  static async adjustPoints(req, res) {
    try {
      const { customerId } = req.params;
      const { points, notes } = req.body;

      if (points === undefined) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Points é obrigatório',
        });
      }

      const transaction = await LoyaltyTransaction.adjustPoints(
        customerId,
        parseInt(points, 10),
        notes
      );

      res.status(201).json({
        success: true,
        message: 'Pontos ajustados com sucesso',
        data: transaction,
      });
    } catch (error) {
      console.error('Erro ao ajustar pontos:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/loyalty-transactions
   * Listar todas as transações
   */
  static async list(req, res) {
    try {
      const { customerId, transactionType, startDate, endDate, limit = 100 } = req.query;

      const filters = {
        customerId,
        transactionType,
        startDate,
        endDate,
        limit: parseInt(limit, 10),
      };

      const transactions = await LoyaltyTransaction.list(filters);

      res.json({
        success: true,
        data: transactions,
        count: transactions.length,
      });
    } catch (error) {
      console.error('Erro ao listar transações:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = LoyaltyTransactionController;
