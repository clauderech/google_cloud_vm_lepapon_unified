'use strict';

const express = require('express');
const StockMovementController = require('../controllers/StockMovementController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * Stock Movements Routes
 */

// POST /api/stock-movements - Criar novo movimento
router.post('/', StockMovementController.create);

// GET /api/stock-movements - Listar movimentos com filtros
router.get('/', StockMovementController.list);

// GET /api/stock-movements/:id - Obter movimento por ID
router.get('/:id', StockMovementController.getById);

// GET /api/stock-movements/product/:productId/summary - Resumo de estoque
router.get('/product/:productId/summary', StockMovementController.getStockSummary);

// PUT /api/stock-movements/:id - Atualizar movimento
router.put('/:id', StockMovementController.update);

// DELETE /api/stock-movements/:id - Deletar movimento
router.delete('/:id', StockMovementController.delete);

module.exports = router;
