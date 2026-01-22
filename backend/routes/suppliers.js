'use strict';

const express = require('express');
const SupplierModel = require('../models/supplier');
const router = express.Router();

// Listar todos os fornecedores
router.get('/', async (req, res) => {
  try {
    const suppliers = await SupplierModel.list();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar fornecedores', details: err.message });
  }
});

// Buscar fornecedor por ID
router.get('/:id', async (req, res) => {
  try {
    const supplier = await SupplierModel.getById(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fornecedor', details: err.message });
  }
});

// Criar fornecedor
router.post('/', async (req, res) => {
  try {
    const result = await SupplierModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar fornecedor', details: err.message });
  }
});

// Atualizar fornecedor
router.put('/:id', async (req, res) => {
  try {
    await SupplierModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar fornecedor', details: err.message });
  }
});

// Remover fornecedor
router.delete('/:id', async (req, res) => {
  try {
    await SupplierModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover fornecedor', details: err.message });
  }
});

module.exports = router;
