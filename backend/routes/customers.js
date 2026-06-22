
const express = require('express');
const CustomerModel = require('../models/customer');
const { requireAuth } = require('../middleware/authUnified');
const { requireAdmin } = require('../middleware/roleAuth');
const router = express.Router();

// Listar todos os clientes
router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await CustomerModel.list();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar clientes', details: err.message });
  }
});

// Dropdown de clientes formatado (id_nome_sobrenome)
router.get('/dropdown', requireAuth, async (req, res) => {
  try {
    console.log('[CUSTOMER][DROPDOWN][REQ]', { timestamp: new Date().toISOString() });
    const dropdownCustomers = await CustomerModel.listForDropdown();
    console.log('[CUSTOMER][DROPDOWN][SUCCESS]', { count: dropdownCustomers.length });
    res.json(dropdownCustomers);
  } catch (err) {
    console.error('[CUSTOMER][DROPDOWN][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao carregar dropdown de clientes', details: err.message });
  }
});

// Buscar cliente por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const customer = await CustomerModel.getById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cliente', details: err.message });
  }
});

// Criar cliente
router.post('/', requireAuth, async (req, res) => {
  try {
    const result = await CustomerModel.create(req.body);
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar cliente', details: err.message });
  }
});

// Atualizar cliente
router.put('/:id', requireAuth, async (req, res) => {
  try {
    await CustomerModel.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar cliente', details: err.message });
  }
});

// Remover cliente
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await CustomerModel.remove(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover cliente', details: err.message });
  }
});

module.exports = router;
