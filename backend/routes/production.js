const express = require('express');
const router = express.Router();
const ProductionController = require('../controllers/production');
const { validateCombined } = require('../middleware/authUnified');

/**
 * Rotas para sistema de produção de insumos caseiros
 */

/**
 * GET /api/production/available
 * Lista insumos que podem ser produzidos (têm receitas)
 * Retorna informações de disponibilidade baseado no estoque dos ingredientes
 */
router.get('/available', validateCombined, ProductionController.listAvailableProductions);

/**
 * POST /api/production/produce
 * Produz um insumo caseiro consumindo ingredientes conforme receita
 * Body: { productId: string, quantity: number, notes?: string }
 */
router.post('/produce', validateCombined, ProductionController.produceItem);

/**
 * GET /api/production/history
 * Obtém histórico de produções realizadas
 * Query params: productId (opcional), limit (padrão 50)
 */
router.get('/history', validateCombined, ProductionController.getProductionHistory);

module.exports = router;