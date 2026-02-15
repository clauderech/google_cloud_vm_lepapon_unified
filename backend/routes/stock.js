const express = require('express');
const router = express.Router();
const StockService = require('../services/stockService');
const StockSyncService = require('../services/stockSyncService');
const { db } = require('../config/knex');

/**
 * Ajuste manual de estoque de um produto
 * PUT /api/stock/:productId/adjust
 */
router.put('/:productId/adjust', async (req, res) => {
  try {
    const { productId } = req.params;
    const { newStock, reason, userId } = req.body;
    
    console.log('[STOCK][ADJUST]', { productId, newStock, reason });
    
    if (newStock === undefined || newStock === null) {
      return res.status(400).json({ 
        error: 'Campo newStock é obrigatório' 
      });
    }
    
    const result = await StockService.adjustStock({
      productId,
      newStock: parseFloat(newStock),
      reason: reason || 'Ajuste manual',
      userId: userId || null
    });
    
    console.log('[STOCK][ADJUST][SUCCESS]', { productId, result });
    
    res.json({
      success: true,
      productId,
      previousStock: result.previousStock,
      newStock: result.newStock,
      adjustment: result.quantity
    });
  } catch (err) {
    console.error('[STOCK][ADJUST][ERROR]', {
      productId: req.params.productId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao ajustar estoque', 
      details: err.message 
    });
  }
});

/**
 * Histórico de movimentações de um produto
 * GET /api/stock/:productId/movements
 */
router.get('/:productId/movements', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit, movement_type } = req.query;
    
    console.log('[STOCK][MOVEMENTS]', { productId, limit, movement_type });
    
    const movements = await StockService.getProductMovements(productId, {
      limit: limit ? parseInt(limit) : 50,
      movement_type
    });
    
    console.log('[STOCK][MOVEMENTS][SUCCESS]', { 
      productId, 
      count: movements.length 
    });
    
    res.json(movements);
  } catch (err) {
    console.error('[STOCK][MOVEMENTS][ERROR]', {
      productId: req.params.productId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao buscar movimentações', 
      details: err.message 
    });
  }
});

/**
 * Alertas de estoque baixo
 * GET /api/stock/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    console.log('[STOCK][ALERTS]');
    
    const stockSyncService = new StockSyncService(db);
    const alerts = await stockSyncService.getStockAlerts();
    
    console.log('[STOCK][ALERTS][SUCCESS]', { count: alerts.length });
    
    res.json(alerts);
  } catch (err) {
    console.error('[STOCK][ALERTS][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao buscar alertas de estoque', 
      details: err.message 
    });
  }
});

/**
 * Estatísticas gerais de estoque
 * GET /api/stock/stats
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('[STOCK][STATS]');
    
    const stats = await StockService.getStockStats();
    
    console.log('[STOCK][STATS][SUCCESS]', { 
      totalProducts: stats.totalProducts,
      lowStockCount: stats.lowStockCount 
    });
    
    res.json(stats);
  } catch (err) {
    console.error('[STOCK][STATS][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao buscar estatísticas de estoque', 
      details: err.message 
    });
  }
});

/**
 * Sincronizar estoque com catálogo WhatsApp
 * POST /api/stock/sync/whatsapp
 */
router.post('/sync/whatsapp', async (req, res) => {
  try {
    console.log('[STOCK][SYNC][WHATSAPP]');
    
    const stockSyncService = new StockSyncService(db);
    const result = await stockSyncService.syncAllProducts();
    
    console.log('[STOCK][SYNC][WHATSAPP][SUCCESS]', result);
    
    res.json({
      success: true,
      message: 'Sincronização com WhatsApp concluída',
      ...result
    });
  } catch (err) {
    console.error('[STOCK][SYNC][WHATSAPP][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao sincronizar com WhatsApp', 
      details: err.message 
    });
  }
});

/**
 * Verificar consistência de estoque
 * GET /api/stock/consistency
 */
router.get('/consistency', async (req, res) => {
  try {
    console.log('[STOCK][CONSISTENCY]');
    
    const stockSyncService = new StockSyncService(db);
    const report = await stockSyncService.checkConsistency();
    
    console.log('[STOCK][CONSISTENCY][SUCCESS]', { 
      inconsistencies: report.inconsistencies_found 
    });
    
    res.json(report);
  } catch (err) {
    console.error('[STOCK][CONSISTENCY][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao verificar consistência de estoque', 
      details: err.message 
    });
  }
});

/**
 * Sincronizar produto específico com WhatsApp
 * POST /api/stock/:productId/sync/whatsapp
 */
router.post('/:productId/sync/whatsapp', async (req, res) => {
  try {
    const { productId } = req.params;
    
    console.log('[STOCK][SYNC][PRODUCT][WHATSAPP]', { productId });
    
    const ProductModel = require('../models/product');
    const product = await ProductModel.getById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const stockSyncService = new StockSyncService(db);
    const result = await stockSyncService.syncProductToCatalog(product);
    
    console.log('[STOCK][SYNC][PRODUCT][WHATSAPP][SUCCESS]', { productId, result });
    
    res.json({
      success: true,
      message: 'Produto sincronizado com WhatsApp',
      ...result
    });
  } catch (err) {
    console.error('[STOCK][SYNC][PRODUCT][WHATSAPP][ERROR]', {
      productId: req.params.productId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao sincronizar produto com WhatsApp', 
      details: err.message 
    });
  }
});

/**
 * Buscar todas as movimentações com filtros
 * GET /api/stock/movements
 */
router.get('/movements', async (req, res) => {
  try {
    const { start_date, end_date, movement_type, limit } = req.query;
    
    console.log('[STOCK][MOVEMENTS][ALL]', { start_date, end_date, movement_type, limit });
    
    const StockMovementModel = require('../models/stockMovement');
    const movements = await StockMovementModel.list({
      start_date,
      end_date,
      movement_type,
      limit: limit ? parseInt(limit) : 100
    });
    
    console.log('[STOCK][MOVEMENTS][ALL][SUCCESS]', { count: movements.length });
    
    res.json(movements);
  } catch (err) {
    console.error('[STOCK][MOVEMENTS][ALL][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao buscar movimentações', 
      details: err.message 
    });
  }
});

module.exports = router;