
const express = require('express');
const ProductModel = require('../models/product');
const router = express.Router();

const ALLOWED_PRODUCT_TYPES = ['prato', 'drink', 'insumo', 'insumo_bebida', 'revenda'];

const validateProductType = (type) => {
  return ALLOWED_PRODUCT_TYPES.includes(type);
};

// Listar todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = await ProductModel.list();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar produtos', details: err.message });
  }
});

// Listar apenas produtos do tipo 'prato' com campos id e name
router.get('/pratos', async (req, res) => {
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
router.get('/revendas', async (req, res) => {
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
router.get('/simple', async (req, res) => {
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

// Buscar produto por ID
router.get('/:id', async (req, res) => {
  try {
    const product = await ProductModel.getById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto', details: err.message });
  }
});

// Criar produto
router.post('/', async (req, res) => {
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
    
    console.log('[PRODUCT][ROUTE][CREATE][SUCCESS]', {
      id: req.body.id,
      resultId: result[0]
    });
    
    res.status(201).json({ success: true, productId: req.body.id || result[0] });
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
router.put('/:id', async (req, res) => {
  try {
    if (req.body.type && !validateProductType(req.body.type)) {
      return res.status(400).json({ error: 'Tipo de produto inválido', details: `Tipos válidos: ${ALLOWED_PRODUCT_TYPES.join(', ')}` });
    }

    await ProductModel.update(req.params.id, req.body);
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
router.delete('/:id', async (req, res) => {
  try {
    await ProductModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto', details: err.message });
  }
});

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const LEPAPON_REMOTE_URL = process.env.LEPAPON_REMOTE_URL || 'https://lepapon.com.br/api/atualiza-prod';
const LEPAPON_REMOTE_TOKEN = process.env.LEPAPON_REMOTE_TOKEN || ''; // opcional, defina no .env se precisar

// Envia produtos tipo prato/drink/revenda para lepapon remoto (campos mínimos)
router.post('/send-to-lepapon', async (req, res) => {
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

    const payload = { products: filtered };

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
});

module.exports = router;
