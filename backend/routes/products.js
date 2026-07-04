
const express = require('express');
const ProductModel = require('../models/product');
const StockService = require('../services/stockService');
const { requireAdmin, requireOperador } = require('../middleware/roleAuth');
const { requireAuth, validateApiKey } = require('../middleware/authUnified');
const router = express.Router();

const ALLOWED_PRODUCT_TYPES = ['prato', 'drink', 'insumo', 'insumo_bebida', 'revenda'];

const validateProductType = (type) => {
  return ALLOWED_PRODUCT_TYPES.includes(type);
};

// Listar todos os produtos
router.get('/', requireAuth, async (req, res) => {
  try {
    const products = await ProductModel.list();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos', details: err.message });
  }
});

// Listar apenas produtos do tipo 'prato' com campos id e name
router.get('/pratos', requireAuth, async (req, res) => {
  try {
    const products = await ProductModel.list();
    const pratos = products
      .filter(p => p.type === 'prato')
      .map(p => ({ id: p.id, name: p.name }));
    res.json(pratos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pratos', details: err.message });
  }
});

// Listar apenas produtos do tipo 'revenda' com campos id e name
router.get('/revendas', requireAuth, async (req, res) => {
  try {
    const products = await ProductModel.list();
    const revendas = products
      .filter(p => p.type === 'revenda')
      .map(p => ({ id: p.id, name: p.name }));
    res.json(revendas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar revendas', details: err.message });
  }
});

// Listar produtos ativos de tipos específicos (prato e revenda) com id, name, price e stock
router.get('/simple', requireAuth, async (req, res) => {
  try {
    const { db } = require('../config/knex');
    const products = await db('products')
      .select('id', 'name', 'price', 'stock')
      .where('is_active', 1)
      .whereIn('type', ['prato', 'revenda'])
      .orderBy('name', 'asc');
    
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos', details: err.message });
  }
});

// Listar produtos dos tipos revenda, drink e prato
router.get('/catalog', requireAuth, async (req, res) => {
  try {
    const { db } = require('../config/knex');
    const products = await db('products')
      .select('id', 'name', 'price', 'stock', 'type')
      .whereIn('type', ['revenda', 'drink', 'prato'])
      .orderBy('name', 'asc');

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos do catálogo', details: err.message });
  }
});

/**
 * ============================================
 * ROTA ANDROID - GET /api/products/android
 * ============================================
 * Catálogo filtrado para app Android
 * Autenticação: X-API-Key obrigatório
 * Tipos: insumo, insumo_bebida, revenda
 */
router.get('/android', validateApiKey, async (req, res) => {
  try {
    const { db } = require('../config/knex');

    console.log('[PRODUCT][ANDROID][LIST]');

    const products = await db('products')
      .select('id', 'name', 'type', 'price', 'cost', 'stock')
      .where('is_active', 1)
      .whereIn('type', ['insumo', 'insumo_bebida', 'revenda'])
      .orderBy('name', 'asc');

    console.log('[PRODUCT][ANDROID][LIST][SUCCESS]', { count: products.length });

    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('[PRODUCT][ANDROID][LIST][ERROR]', {
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({
      error: 'Erro ao listar produtos',
      details: err.message
    });
  }
});

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const LEPAPON_REMOTE_URL = process.env.LEPAPON_REMOTE_URL || 'https://lepapon.com.br/api/atualiza-prod';
const LEPAPON_REMOTE_STOCK_URL = process.env.LEPAPON_REMOTE_STOCK_URL || 'https://lepapon.com.br/api/produtos';
const LEPAPON_REMOTE_TOKEN = process.env.LEPAPON_REMOTE_TOKEN || ''; // opcional, defina no .env se precisar

// Envia produtos tipo prato/drink/revenda para lepapon remoto (campos mínimos)
const sendProductsToLepapon = async (req, res) => {
  try {
    const products = await ProductModel.list();
    const filtered = products
      .filter(p => ['prato', 'revenda'].includes(p.type))
      .map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        updated_at: p.updated_at
      }));

    const payload = filtered;

    const headers = { 'Content-Type': 'application/json' };
    if (LEPAPON_REMOTE_TOKEN) headers.Authorization = `Bearer ${LEPAPON_REMOTE_TOKEN}`;

    const resp = await axios.post(LEPAPON_REMOTE_URL, payload, { headers, timeout: 15000 });

    res.json({
      success: true,
      remoteStatus: resp.status,
      remoteData: resp.data,
      sentCount: filtered.length
    });
  } catch (err) {
    console.error('[PRODUCT][SEND_TO_LEPAPON][ERROR]', err?.message || err);
    res.status(500).json({ error: 'Falha ao enviar produtos para Lepapon', details: err?.message || String(err) });
  }
};

router.post('/send-to-lepapon', requireAuth, sendProductsToLepapon);

// Buscar produto por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const product = await ProductModel.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto', details: err.message });
  }
});

// Criar produto
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!validateProductType(req.body.type)) {
      return res.status(400).json({ error: 'Tipo de produto inválido', details: `Tipos válidos: ${ALLOWED_PRODUCT_TYPES.join(', ')}` });
    }

    console.log('[PRODUCT][ROUTE][CREATE][REQ]', {
      id: req.body.id,
      name: req.body.name,
      type: req.body.type,
      bodyKeys: Object.keys(req.body)
    });
    
    const result = await ProductModel.create(req.body);
    const createdProductId = req.body.id || result[0];
    
    if (req.body.stock !== undefined && ['prato', 'revenda'].includes(req.body.type)) {
      try {
        await StockService.syncProductStockToLepapon(createdProductId);
      } catch (syncErr) {
        console.error('[PRODUCT][ROUTE][CREATE][LEPAPON_SYNC_ERROR]', {
          productId: createdProductId,
          error: syncErr.message,
          stack: syncErr.stack
        });
      }
    }

    console.log('[PRODUCT][ROUTE][CREATE][SUCCESS]', {
      id: req.body.id,
      resultId: result[0]
    });
    
    res.status(201).json({ success: true, productId: createdProductId });
  } catch (err) {
    console.error('[PRODUCT][ROUTE][CREATE][ERROR]', {
      id: req.body.id,
      name: req.body.name,
      error: err.message,
      code: err.code,
      stack: err.stack
    });
    res.status(500).json({ 
      error: 'Erro ao criar produto', 
      details: err.message,
      code: err.code
    });
  }
});

// Atualizar produto
router.put('/:id', requireAuth, requireOperador, async (req, res) => {
  try {
    if (req.body.type && !validateProductType(req.body.type)) {
      return res.status(400).json({ error: 'Tipo de produto inválido', details: `Tipos válidos: ${ALLOWED_PRODUCT_TYPES.join(', ')}` });
    }

    const existingProduct = await ProductModel.getById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const { stock, ...updateData } = req.body;
    if (Object.keys(updateData).length > 0) {
      await ProductModel.update(req.params.id, updateData);
    }

    if (stock !== undefined && stock !== null) {
      await StockService.adjustStock({
        productId: req.params.id,
        newStock: parseFloat(stock),
        reason: 'Atualização de produto',
        userId: req.body.userId || null
      });
    } else if (req.body.type && req.body.type !== existingProduct.type && ['prato', 'revenda'].includes(req.body.type)) {
      await StockService.syncProductStockToLepapon(req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[ERRO PRODUTO PUT]', {
      id: req.params.id,
      body: req.body,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({
      error: 'Erro ao atualizar produto',
      details: err.message,
      body: req.body,
      stack: err.stack
    });
  }
});

// Remover produto
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await ProductModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto', details: err.message });
  }
});

// Proxy para atualizar stock de produto no Lepapon através do backend, evitando CORS
router.patch('/:id/lepapon-stock', async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock === null) {
      return res.status(400).json({ error: 'Campo stock é obrigatório' });
    }

    const headers = { 'Content-Type': 'application/json' };
    if (LEPAPON_REMOTE_TOKEN) headers.Authorization = `Bearer ${LEPAPON_REMOTE_TOKEN}`;

    const resp = await axios.patch(
      `${LEPAPON_REMOTE_STOCK_URL}/${encodeURIComponent(req.params.id)}/stock`,
      { stock },
      { headers, timeout: 15000 }
    );

    res.json({
      success: true,
      remoteStatus: resp.status,
      remoteData: resp.data
    });
  } catch (err) {
    console.error('[PRODUCT][LEPAPON_STOCK_PATCH][ERROR]', err?.message || err);
    const status = err.response?.status || 500;
    const data = err.response?.data || err.message || String(err);
    res.status(status).json({ error: 'Falha ao atualizar estoque no Lepapon', details: data });
  }
});

module.exports = router;
