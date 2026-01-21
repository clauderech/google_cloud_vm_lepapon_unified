'use strict';

const Comanda = require('../models/Comanda');
const ComandaItem = require('../models/ComandaItem');

/**
 * Controller: ComandaController
 * Gerencia comandas (pedidos abertos em PDV e LePapon)
 */

class ComandaController {
  /**
   * POST /api/comandas
   * Criar nova comanda
   */
  static async create(req, res) {
    try {
      const { customerName, customerId, tableNumber, source, notes } = req.body;

      if (!customerName) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'customerName é obrigatório',
        });
      }

      const comanda = await Comanda.create({
        customerName,
        customerId,
        tableNumber,
        source: source || 'pos',
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Comanda criada com sucesso',
        data: comanda,
      });
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/comandas/:id
   * Obter comanda por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const comanda = await Comanda.findById(id);

      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      res.json({
        success: true,
        data: comanda,
      });
    } catch (error) {
      console.error('Erro ao buscar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/comandas
   * Listar comandas com filtros
   */
  static async list(req, res) {
    try {
      const { status = 'open', source, customerId, tableNumber, startDate, endDate, limit = 100 } = req.query;

      const filters = {
        status,
        source,
        customerId,
        tableNumber,
        startDate,
        endDate,
        limit: parseInt(limit, 10),
      };

      const comandas = await Comanda.list(filters);

      res.json({
        success: true,
        data: comandas,
        count: comandas.length,
      });
    } catch (error) {
      console.error('Erro ao listar comandas:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * GET /api/comandas/open
   * Listar apenas comandas abertas
   */
  static async listOpen(req, res) {
    try {
      const { source } = req.query;

      const comandas = await Comanda.listOpen(source);

      res.json({
        success: true,
        data: comandas,
        count: comandas.length,
      });
    } catch (error) {
      console.error('Erro ao listar comandas abertas:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * POST /api/comandas/:id/items
   * Adicionar item à comanda
   */
  static async addItem(req, res) {
    try {
      const { id } = req.params;
      const { productId, productName, quantity, unitPrice } = req.body;

      if (!productId || !productName || !quantity || !unitPrice) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Campos obrigatórios: productId, productName, quantity, unitPrice',
        });
      }

      // Verificar se comanda existe
      const comanda = await Comanda.findById(id);
      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      const item = await ComandaItem.create({
        comandaId: id,
        productId,
        productName,
        quantity: parseFloat(quantity),
        unitPrice: parseFloat(unitPrice),
      });

      // Recalcular total da comanda
      await Comanda.calculateTotal(id);

      res.status(201).json({
        success: true,
        message: 'Item adicionado à comanda',
        data: item,
      });
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/comandas/:comandaId/items/:itemId
   * Atualizar item da comanda
   */
  static async updateItem(req, res) {
    try {
      const { comandaId, itemId } = req.params;
      const { quantity, unitPrice, status } = req.body;

      const item = await ComandaItem.findById(itemId);

      if (!item || item.comanda_id !== comandaId) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Item não encontrado',
        });
      }

      const updated = await ComandaItem.update(itemId, {
        quantity: quantity !== undefined ? parseFloat(quantity) : item.quantity,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : item.unit_price,
        status,
      });

      // Recalcular total
      await Comanda.calculateTotal(comandaId);

      res.json({
        success: true,
        message: 'Item atualizado com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/comandas/:comandaId/items/:itemId
   * Remover item da comanda
   */
  static async removeItem(req, res) {
    try {
      const { comandaId, itemId } = req.params;

      const item = await ComandaItem.findById(itemId);

      if (!item || item.comanda_id !== comandaId) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Item não encontrado',
        });
      }

      await ComandaItem.delete(itemId);

      // Recalcular total
      await Comanda.calculateTotal(comandaId);

      res.json({
        success: true,
        message: 'Item removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao remover item:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/comandas/:id/close
   * Fechar comanda (marcar como closed)
   */
  static async close(req, res) {
    try {
      const { id } = req.params;
      const { paymentMethod } = req.body;

      const comanda = await Comanda.findById(id);

      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      const updated = await Comanda.close(id);

      if (paymentMethod) {
        await Comanda.update(id, { paymentMethod });
      }

      res.json({
        success: true,
        message: 'Comanda fechada com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao fechar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/comandas/:id/cancel
   * Cancelar comanda
   */
  static async cancel(req, res) {
    try {
      const { id } = req.params;

      const comanda = await Comanda.findById(id);

      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      const updated = await Comanda.cancel(id);

      res.json({
        success: true,
        message: 'Comanda cancelada com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao cancelar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/comandas/:id
   * Atualizar comanda (geral)
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { customerName, customerId, tableNumber, notes } = req.body;

      const comanda = await Comanda.findById(id);

      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      const updated = await Comanda.update(id, {
        customerName,
        customerId,
        tableNumber,
        notes,
      });

      res.json({
        success: true,
        message: 'Comanda atualizada com sucesso',
        data: updated,
      });
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/comandas/:id
   * Deletar comanda
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const comanda = await Comanda.findById(id);

      if (!comanda) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Comanda não encontrada',
        });
      }

      await Comanda.delete(id);

      res.json({
        success: true,
        message: 'Comanda deletada com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar comanda:', error);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message,
      });
    }
  }
}

module.exports = ComandaController;
