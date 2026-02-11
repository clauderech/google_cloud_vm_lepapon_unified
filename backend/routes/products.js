
const express = require('express');
const ProductModel = require('../models/product');
const router = express.Router();


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

module.exports = router;
