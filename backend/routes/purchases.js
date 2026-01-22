'use strict';

const express = require('express');
const PurchaseModel = require('../models/purchase');
const router = express.Router();

// Listar todas as compras
router.get('/', async (req, res) => {
  try {
    const purchases = await PurchaseModel.list();
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar compras', details: err.message });
  }
});

// Buscar compra por ID
router.get('/:id', async (req, res) => {
  try {
    const purchase = await PurchaseModel.getById(req.params.id);
    if (!purchase) return res.status(404).json({ error: 'Compra não encontrada' });
    res.json(purchase);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar compra', details: err.message });
  }
});

// Criar compra
router.post('/', async (req, res) => {
  try {
    const result = await PurchaseModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar compra', details: err.message });
  }
});

// Atualizar compra
router.put('/:id', async (req, res) => {
  try {
    await PurchaseModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar compra', details: err.message });
  }
});

// Remover compra
router.delete('/:id', async (req, res) => {
  try {
    await PurchaseModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover compra', details: err.message });
  }
});

module.exports = router;
