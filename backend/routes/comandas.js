'use strict';

const express = require('express');
const ComandaModel = require('../models/comanda');
const router = express.Router();

// Listar todas as comandas
router.get('/', async (req, res) => {
  try {
    const comandas = await ComandaModel.list();
    res.json(comandas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar comandas', details: err.message });
  }
});

// Buscar comanda por ID
router.get('/:id', async (req, res) => {
  try {
    const comanda = await ComandaModel.getById(req.params.id);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    // Buscar itens da comanda
    const items = await ComandaModel.getItems(req.params.id);
    comanda.items = items;
    res.json(comanda);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar comanda', details: err.message });
  }
});

// Criar comanda
router.post('/', async (req, res) => {
  try {
    const result = await ComandaModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar comanda', details: err.message });
  }
});

// Atualizar comanda
router.put('/:id', async (req, res) => {
  try {
    await ComandaModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar comanda', details: err.message });
  }
});

// Remover comanda
router.delete('/:id', async (req, res) => {
  try {
    await ComandaModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover comanda', details: err.message });
  }
});

module.exports = router;
