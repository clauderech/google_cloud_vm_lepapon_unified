const express = require('express');
const ShoppingListModel = require('../models/shoppingList');
const { requireAuth } = require('../middleware/authUnified');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    res.json(await ShoppingListModel.listPending());
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar compras pendentes', details: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { id, productId, supplierId, quantity, priority, notes } = req.body;
    if (!productId) return res.status(400).json({ error: 'Campo productId é obrigatório' });
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      return res.status(400).json({ error: 'Campo quantity deve ser maior que 0' });
    }
    if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridade inválida' });
    }

    const itemId = await ShoppingListModel.create({ id, productId, supplierId, quantity, priority, notes });
    res.status(201).json({ success: true, itemId });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar item à lista', details: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await ShoppingListModel.update(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Item pendente não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar item da lista', details: err.message });
  }
});

router.post('/:id/complete', async (req, res) => {
  try {
    const updated = await ShoppingListModel.markPurchased(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Item pendente não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao concluir item da lista', details: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const removed = await ShoppingListModel.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Item pendente não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover item da lista', details: err.message });
  }
});

module.exports = router;