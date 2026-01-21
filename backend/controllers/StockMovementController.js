'use strict';

const StockMovement = require('../models/StockMovement');

/**
 * Controller: StockMovementController
 * Gerencia movimentações de estoque
 */

class StockMovementController {
  /**
   * POST /api/stock-movements
   * Criar novo movimento de estoque
   */
  static async create(req, res) {
    try {
      const { productId, movementType, quantity, previousStock, newStock, referenceType, referenceId, costImpact, notes, createdBy } = req.body;

      // Validações
      if (!productId || !movementType || quantity === undefined || previousStock === undefined || newStock === undefined) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: productId, movementType, quantity, previousStock, newStock',
        });
      }

      const validTypes = ['entrada', 'saida', 'ajuste', 'perda', 'devolucao'];
      if (!validTypes.includes(movementType)) {
        return res.status(400).json({
          error: 'INVALID_MOVEMENT_TYPE',
          message: `movementType deve ser um de: ${validTypes.join(', ')}`,
        });
      }

      const movement = await StockMovement.create({
        productId,
        movementType,
        quantity: parseFloat(quantity),
        previousStock: parseFloat(previousStock),
        newStock: parseFloat(newStock),
        referenceType,
        referenceId,
        costImpact: costImpact ? parseFloat(costImpact) : null,
        notes,
        createdBy: createdBy || req.user?.id || 'system',
      });

      res.status(201).json({
        success: true,
        message: 'Movimento de estoque registrado com sucesso',
        data: movement,
      });
    } catch (error) {
      console.error('Erro ao criar movimento de estoque:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/stock-movements/:id
   * Obter movimento por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const movement = await StockMovement.findById(id);

      if (!movement) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Movimento de estoque não encontrado',
        });
      }

      res.json({
        success: true,
        data: movement,
      });
    } catch (error) {
      console.error('Erro ao buscar movimento:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/stock-movements
   * Listar movimentos com filtros
   */
  static async list(req, res) {
    try {
      const { productId, movementType, referenceType, startDate, endDate, limit = 100 } = req.query;

      const filters = {
        productId,
        movementType,
        referenceType,
        startDate,
        endDate,
        limit: parseInt(limit, 10),
      };

      const movements = await StockMovement.list(filters);

      res.json({
        success: true,
        data: movements,
        count: movements.length,
      });
    } catch (error) {
      console.error('Erro ao listar movimentos:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/stock-movements/product/:productId/summary
   * Obter resumo de estoque de um produto
   */
  static async getStockSummary(req, res) {
    try {
      const { productId } = req.params;

      const summary = await StockMovement.getStockSummary(productId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Erro ao obter resumo de estoque:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/stock-movements/:id
   * Atualizar movimento
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { movementType, quantity, previousStock, newStock, referenceType, referenceId, costImpact, notes } = req.body;

      const movement = await StockMovement.findById(id);

      if (!movement) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Movimento de estoque não encontrado',
        });
      }

      const updated = await StockMovement.update(id, {
        movementType,
        quantity: quantity !== undefined ? parseFloat(quantity) : movement.quantity,
        previousStock: previousStock !== undefined ? parseFloat(previousStock) : movement.previous_stock,
        newStock: newStock !== undefined ? parseFloat(newStock) : movement.new_stock,
        referenceType,
        referenceId,
        costImpact: costImpact !== undefined ? parseFloat(costImpact) : movement.cost_impact,
        notes,
      });

      res.json({
        success: true,
        message: 'Movimento atualizado com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar movimento:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/stock-movements/:id
   * Deletar movimento
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const movement = await StockMovement.findById(id);

      if (!movement) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Movimento de estoque não encontrado',
        });
      }

      await StockMovement.delete(id);

      res.json({
        success: true,
        message: 'Movimento deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar movimento:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = StockMovementController;
