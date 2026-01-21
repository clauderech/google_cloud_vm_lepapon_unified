'use strict';

const express = require('express');
const LoyaltyTransactionController = require('../controllers/LoyaltyTransactionController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

/**
 * Loyalty Transactions Routes
 */

// POST /api/loyalty-transactions - Criar nova transação
router.post('/', LoyaltyTransactionController.create);

// GET /api/loyalty-transactions - Listar transações
router.get('/', LoyaltyTransactionController.list);

// GET /api/loyalty-transactions/:id - Obter transação por ID
router.get('/:id', LoyaltyTransactionController.getById);

// GET /api/loyalty-transactions/customer/:customerId - Listar por cliente
router.get('/customer/:customerId', LoyaltyTransactionController.listByCustomer);

// GET /api/loyalty-transactions/customer/:customerId/balance - Obter saldo
router.get('/customer/:customerId/balance', LoyaltyTransactionController.getBalance);

// POST /api/loyalty-transactions/customer/:customerId/add-points - Adicionar pontos
router.post('/customer/:customerId/add-points', LoyaltyTransactionController.addPoints);

// POST /api/loyalty-transactions/customer/:customerId/redeem-points - Resgatar pontos
router.post('/customer/:customerId/redeem-points', LoyaltyTransactionController.redeemPoints);

// POST /api/loyalty-transactions/customer/:customerId/adjust-points - Ajustar pontos
router.post('/customer/:customerId/adjust-points', LoyaltyTransactionController.adjustPoints);

module.exports = router;
