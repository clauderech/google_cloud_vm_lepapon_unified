
const express = require('express');
const CustomerModel = require('../models/customer');
const router = express.Router();

// Listar todos os clientes
router.get('/', async (req, res) => {
  try {
    const customers = await CustomerModel.list();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar clientes', details: err.message });
  }
});

// Buscar cliente por ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await CustomerModel.getById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cliente', details: err.message });
  }
});

// Criar cliente
router.post('/', async (req, res) => {
  try {
    const result = await CustomerModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cliente', details: err.message });
  }
});

// Atualizar cliente
router.put('/:id', async (req, res) => {
  try {
    await CustomerModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente', details: err.message });
  }
});

// Remover cliente
router.delete('/:id', async (req, res) => {
  try {
    await CustomerModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover cliente', details: err.message });
  }
});

module.exports = router;
