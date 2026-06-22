
const express = require('express');
const SaleModel = require('../models/sale');
const { requireAuth } = require('../middleware/authUnified');
const router = express.Router();

// Listar todas as vendas
router.get('/', requireAuth, async (req, res) => {
  try {
    const sales = await SaleModel.list();
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar vendas', details: err.message });
  }
});

// Buscar venda por ID
router.get('/:id', async (req, res) => {
  try {
    const sale = await SaleModel.getById(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar venda', details: err.message });
  }
});

// Criar venda
router.post('/', requireAuth, async (req, res) => {
  try {
    console.log('[SALES][POST][REQ]', { 
      bodySize: JSON.stringify(req.body).length,
      items: req.body.items?.length || 0,
      total: req.body.total,
      paymentMethod: req.body.paymentMethod
    });
    
    const result = await SaleModel.create(req.body);
    
    console.log('[SALES][POST][SUCCESS]', { saleId: result[0] });
    res.status(201).json({ success: true, saleId: result[0] });
  } catch (err) {
    console.error('[SALES][POST][ERROR]', { 
      error: err.message, 
      stack: err.stack,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Erro ao criar venda', 
      details: err.message,
      code: err.code || 'UNKNOWN'
    });
  }
});

// Atualizar venda
router.put('/:id', async (req, res) => {
  try {
    await SaleModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar venda', details: err.message });
  }
});

// Remover venda
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await SaleModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover venda', details: err.message });
  }
});

module.exports = router;
