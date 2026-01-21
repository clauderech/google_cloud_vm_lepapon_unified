'use strict';

const express = require('express');
const ComandaController = require('../controllers/ComandaController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * Comandas Routes
 */

// POST /api/comandas - Criar nova comanda
router.post('/', ComandaController.create);

// GET /api/comandas - Listar comandas com filtros
router.get('/', ComandaController.list);

// GET /api/comandas/open - Listar apenas comandas abertas
router.get('/open', ComandaController.listOpen);

// GET /api/comandas/:id - Obter comanda por ID
router.get('/:id', ComandaController.getById);

// POST /api/comandas/:id/items - Adicionar item
router.post('/:id/items', ComandaController.addItem);

// PUT /api/comandas/:comandaId/items/:itemId - Atualizar item
router.put('/:comandaId/items/:itemId', ComandaController.updateItem);

// DELETE /api/comandas/:comandaId/items/:itemId - Remover item
router.delete('/:comandaId/items/:itemId', ComandaController.removeItem);

// PUT /api/comandas/:id/close - Fechar comanda
router.put('/:id/close', ComandaController.close);

// PUT /api/comandas/:id/cancel - Cancelar comanda
router.put('/:id/cancel', ComandaController.cancel);

// PUT /api/comandas/:id - Atualizar comanda
router.put('/:id', ComandaController.update);

// DELETE /api/comandas/:id - Deletar comanda
router.delete('/:id', ComandaController.delete);

module.exports = router;
