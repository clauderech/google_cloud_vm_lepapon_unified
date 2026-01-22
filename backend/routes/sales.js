'use strict';

const express = require('express');
const SaleModel = require('../models/sale');
const router = express.Router();

// Listar todas as vendas
router.get('/', async (req, res) => {
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
router.post('/', async (req, res) => {
  try {
    const result = await SaleModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar venda', details: err.message });
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
router.delete('/:id', async (req, res) => {
  try {
    await SaleModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover venda', details: err.message });
  }
});

module.exports = router;
