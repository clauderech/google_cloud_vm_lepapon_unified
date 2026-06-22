const express = require('express');
const router = express.Router();
const StockService = require('../services/stockService');
const { db } = require('../config/knex');
const { requireOperador } = require('../middleware/roleAuth');

/**
 * Rota para relatório de produtos com estoque baixo
 * GET /api/reports/low-stock
 */
router.get('/low-stock', requireOperador, async (req, res) => {
  try {
    console.log('[REPORTS][LOW_STOCK][REQUEST]');
    
    const lowStockProducts = await StockService.getLowStockProducts();
    
    console.log('[REPORTS][LOW_STOCK][SUCCESS]', { 
      count: lowStockProducts.length 
    });
    
    res.json(lowStockProducts);
  } catch (err) {
    console.error('[REPORTS][LOW_STOCK][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de estoque baixo', 
      details: err.message 
    });
  }
});

/**
 * Rota para estatísticas gerais de estoque
 * GET /api/reports/stock-stats
 */
router.get('/stock-stats', requireOperador, async (req, res) => {
  try {
    console.log('[REPORTS][STOCK_STATS][REQUEST]');
    
    const stats = await StockService.getStockStats();
    
    console.log('[REPORTS][STOCK_STATS][SUCCESS]', { 
      totalProducts: stats.totalProducts,
      lowStockCount: stats.lowStockCount 
    });
    
    res.json(stats);
  } catch (err) {
    console.error('[REPORTS][STOCK_STATS][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao gerar estatísticas de estoque', 
      details: err.message 
    });
  }
});

/**
 * Rota para histórico de movimentações de um produto
 * GET /api/reports/stock-movements/:productId
 */
router.get('/stock-movements/:productId', requireOperador, async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit, movement_type } = req.query;
    
    console.log('[REPORTS][STOCK_MOVEMENTS][REQUEST]', { productId });
    
    const movements = await StockService.getProductMovements(productId, {
      limit: limit ? parseInt(limit) : 50,
      movement_type
    });
    
    console.log('[REPORTS][STOCK_MOVEMENTS][SUCCESS]', { 
      productId,
      count: movements.length 
    });
    
    res.json(movements);
  } catch (err) {
    console.error('[REPORTS][STOCK_MOVEMENTS][ERROR]', {
      productId: req.params.productId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao buscar movimentações do produto', 
      details: err.message 
    });
  }
});

/**
 * Rota para relatório de vendas por produto
 * GET /api/reports/sales-by-product
 */
router.get('/sales-by-product', requireOperador, async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    
    console.log('[REPORTS][SALES_BY_PRODUCT][REQUEST]', { start_date, end_date });
    
    let query = db('sale_items')
      .select('product_id', 'product_name')
      .sum('quantity as total_quantity')
      .sum(db.raw('quantity * unit_price as total_value'))
      .count('* as total_sales')
      .groupBy('product_id', 'product_name')
      .orderBy('total_quantity', 'desc');
    
    if (start_date) {
      query = query.join('sales', 'sale_items.sale_id', 'sales.id')
        .where('sales.date', '>=', start_date);
    }
    
    if (end_date) {
      if (!start_date) {
        query = query.join('sales', 'sale_items.sale_id', 'sales.id');
      }
      query = query.where('sales.date', '<=', end_date);
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const salesData = await query;
    
    console.log('[REPORTS][SALES_BY_PRODUCT][SUCCESS]', { 
      count: salesData.length 
    });
    
    res.json(salesData);
  } catch (err) {
    console.error('[REPORTS][SALES_BY_PRODUCT][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de vendas por produto', 
      details: err.message 
    });
  }
});

module.exports = router;