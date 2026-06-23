const express = require('express');
const router = express.Router();
const StockService = require('../services/stockService');
const { db } = require('../config/knex');
const { requireOperador } = require('../middleware/roleAuth');
const { validateApiKey } = require('../middleware/authUnified');

console.log('[REPORTS][ROUTES] Reports routes loaded successfully');

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPORT_LIMIT = 1000;

function parseIsoDateOnly(value) {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

function validateSalesByProductQuery(query) {
  const { start_date, end_date, limit } = query;

  const startDate = start_date ? parseIsoDateOnly(start_date) : null;
  if (start_date && !startDate) {
    return {
      valid: false,
      error: 'Parâmetro start_date inválido. Use formato YYYY-MM-DD.'
    };
  }

  const endDate = end_date ? parseIsoDateOnly(end_date) : null;
  if (end_date && !endDate) {
    return {
      valid: false,
      error: 'Parâmetro end_date inválido. Use formato YYYY-MM-DD.'
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      valid: false,
      error: 'Parâmetro inválido: start_date não pode ser maior que end_date.'
    };
  }

  let parsedLimit = null;
  if (limit !== undefined) {
    const limitString = String(limit).trim();
    if (!/^\d+$/.test(limitString)) {
      return {
        valid: false,
        error: 'Parâmetro limit inválido. Informe um inteiro positivo.'
      };
    }

    parsedLimit = parseInt(limitString, 10);
    if (parsedLimit < 1 || parsedLimit > MAX_REPORT_LIMIT) {
      return {
        valid: false,
        error: `Parâmetro limit fora da faixa permitida (1-${MAX_REPORT_LIMIT}).`
      };
    }
  }

  return {
    valid: true,
    startDate,
    endDate,
    limit: parsedLimit
  };
}

/**
 * ============================================
 * ROTAS ANDROID - Autenticação via API Key
 * ============================================
 */

/**
 * GET /api/reports/android/low-stock
 * Relatório de produtos com estoque baixo (Android)
 */
router.get('/android/low-stock', validateApiKey, async (req, res) => {
  try {
    console.log('[REPORTS][ANDROID][LOW_STOCK][REQUEST]');
    
    const lowStockProducts = await StockService.getLowStockProducts();
    
    console.log('[REPORTS][ANDROID][LOW_STOCK][SUCCESS]', { 
      count: lowStockProducts.length 
    });
    
    res.json({
      success: true,
      data: lowStockProducts
    });
  } catch (err) {
    console.error('[REPORTS][ANDROID][LOW_STOCK][ERROR]', {
      error: err.message
    });
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de estoque baixo', 
      message: err.message 
    });
  }
});

/**
 * GET /api/reports/android/stock-stats
 * Estatísticas gerais de estoque (Android)
 */
router.get('/android/stock-stats', validateApiKey, async (req, res) => {
  try {
    console.log('[REPORTS][ANDROID][STOCK_STATS][REQUEST]');
    
    const stats = await StockService.getStockStats();
    
    console.log('[REPORTS][ANDROID][STOCK_STATS][SUCCESS]', { 
      totalProducts: stats.totalProducts,
      lowStockCount: stats.lowStockCount 
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('[REPORTS][ANDROID][STOCK_STATS][ERROR]', {
      error: err.message
    });
    res.status(500).json({ 
      error: 'Erro ao gerar estatísticas de estoque', 
      message: err.message 
    });
  }
});

/**
 * GET /api/reports/android/stock-movements/:productId
 * Histórico de movimentações de um produto (Android)
 */
router.get('/android/stock-movements/:productId', validateApiKey, async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit, movement_type } = req.query;
    
    console.log('[REPORTS][ANDROID][STOCK_MOVEMENTS][REQUEST]', { productId });
    
    const movements = await StockService.getProductMovements(productId, {
      limit: limit ? parseInt(limit) : 50,
      movement_type
    });
    
    console.log('[REPORTS][ANDROID][STOCK_MOVEMENTS][SUCCESS]', { 
      productId,
      count: movements.length 
    });
    
    res.json({
      success: true,
      data: movements
    });
  } catch (err) {
    console.error('[REPORTS][ANDROID][STOCK_MOVEMENTS][ERROR]', {
      productId: req.params.productId,
      error: err.message
    });
    res.status(500).json({ 
      error: 'Erro ao buscar movimentações do produto', 
      message: err.message 
    });
  }
});

/**
 * GET /api/reports/android/sales-by-product
 * Relatório de vendas por produto (Android)
 */
router.get('/android/sales-by-product', validateApiKey, async (req, res) => {
  try {
    const validation = validateSalesByProductQuery(req.query);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        message: validation.error
      });
    }

    const { startDate, endDate, limit } = validation;
    
    console.log('[REPORTS][ANDROID][SALES_BY_PRODUCT][REQUEST]', {
      start_date: startDate,
      end_date: endDate,
      limit
    });
    
    let query = db('sale_items')
      .select('product_id', 'product_name')
      .sum('quantity as total_quantity')
      .sum({ total_value: db.raw('quantity * unit_price') })
      .count('* as total_sales')
      .groupBy('product_id', 'product_name')
      .orderBy('total_quantity', 'desc');
    
    if (startDate) {
      query = query.join('sales', 'sale_items.sale_id', 'sales.id')
        .where('sales.date', '>=', startDate);
    }
    
    if (endDate) {
      if (!startDate) {
        query = query.join('sales', 'sale_items.sale_id', 'sales.id');
      }
      query = query.where('sales.date', '<=', endDate);
    }
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const salesData = await query;
    
    console.log('[REPORTS][ANDROID][SALES_BY_PRODUCT][SUCCESS]', { 
      count: salesData.length 
    });
    
    res.json({
      success: true,
      data: salesData
    });
  } catch (err) {
    console.error('[REPORTS][ANDROID][SALES_BY_PRODUCT][ERROR]', {
      error: err.message
    });
    res.status(500).json({ 
      error: 'Erro ao gerar relatório de vendas por produto', 
      message: err.message 
    });
  }
});

/**
 * ============================================
 * ROTAS WEB - Autenticação via Sessão
 * ============================================
 */

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
    const validation = validateSalesByProductQuery(req.query);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Parâmetros inválidos',
        details: validation.error
      });
    }

    const { startDate, endDate, limit } = validation;
    
    console.log('[REPORTS][SALES_BY_PRODUCT][REQUEST]', {
      start_date: startDate,
      end_date: endDate,
      limit
    });
    
    let query = db('sale_items')
      .select('product_id', 'product_name')
      .sum('quantity as total_quantity')
      .sum({ total_value: db.raw('quantity * unit_price') })
      .count('* as total_sales')
      .groupBy('product_id', 'product_name')
      .orderBy('total_quantity', 'desc');
    
    if (startDate) {
      query = query.join('sales', 'sale_items.sale_id', 'sales.id')
        .where('sales.date', '>=', startDate);
    }
    
    if (endDate) {
      if (!startDate) {
        query = query.join('sales', 'sale_items.sale_id', 'sales.id');
      }
      query = query.where('sales.date', '<=', endDate);
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