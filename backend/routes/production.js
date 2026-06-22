const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/production');
const { requireAuth } = require('../middleware/authUnified');
const { requireOperador } = require('../middleware/roleAuth');

console.log('[PRODUCTION][ROUTES] Production routes loaded successfully');

/**
 * Rotas para sistema de produção de insumos caseiros
 */

// Rota de teste
router.get('/test', (req, res) => {
  console.log('[PRODUCTION][ROUTES] GET /test called - working!');
  res.json({ success: true, message: 'Production routes are working!' });
});

/**
 * GET /api/production/available
 * Lista insumos que podem ser produzidos (têm receitas)
 * Retorna informações de disponibilidade baseado no estoque dos ingredientes
 */
router.get('/available', requireAuth, requireOperador, (req, res) => {
  console.log('[PRODUCTION][ROUTES] GET /available called');
  ProductionController.listAvailableProductions(req, res);
});

/**
 * POST /api/production/produce
 * Produz um insumo caseiro consumindo ingredientes conforme receita
 * Body: { productId: string, quantity: number, notes?: string }
 */
router.post('/produce', requireAuth, requireOperador, ProductionController.produceItem);

/**
 * GET /api/production/history
 * Obtém histórico de produções realizadas
 * Query params: productId (opcional), limit (padrão 50)
 */
router.get('/history', requireAuth, requireOperador, ProductionController.getProductionHistory);

module.exports = router;