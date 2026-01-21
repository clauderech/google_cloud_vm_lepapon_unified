'use strict';

const express = require('express');
const ComandaController = require('../controllers/ComandaController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireOpenCashRegister, validateCashRegisterIfPresent } = require('../middleware/cashRegisterMiddleware');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// POST /api/comandas - Criar nova comanda
router.post('/', validateCashRegisterIfPresent, ComandaController.create);

// GET /api/comandas - Listar comandas com filtros
router.get('/', ComandaController.list);

// GET /api/comandas/open - Listar apenas comandas abertas
router.get('/open', ComandaController.listOpen);

// GET /api/comandas/:id - Obter comanda por ID
router.get('/:id', ComandaController.getById);

// POST /api/comandas/:id/items - Adicionar item [REQUER CAIXA ABERTO]
router.post('/:id/items', requireOpenCashRegister, ComandaController.addItem);

// PUT /api/comandas/:comandaId/items/:itemId - Atualizar item [REQUER CAIXA ABERTO]
router.put('/:comandaId/items/:itemId', requireOpenCashRegister, ComandaController.updateItem);

// DELETE /api/comandas/:comandaId/items/:itemId - Remover item [REQUER CAIXA ABERTO]
router.delete('/:comandaId/items/:itemId', requireOpenCashRegister, ComandaController.removeItem);

// PUT /api/comandas/:id/close - Fechar comanda [REQUER CAIXA ABERTO]
router.put('/:id/close', requireOpenCashRegister, ComandaController.close);

// PUT /api/comandas/:id/cancel - Cancelar comanda
router.put('/:id/cancel', ComandaController.cancel);

// PUT /api/comandas/:id - Atualizar comanda
router.put('/:id', ComandaController.update);

// DELETE /api/comandas/:id - Deletar comanda
router.delete('/:id', ComandaController.delete);

module.exports = router;
