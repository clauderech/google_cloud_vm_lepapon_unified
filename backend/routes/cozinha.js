
const express = require('express');
const router = express.Router();
const CozinhaItem = require('../models/cozinha_item');
const { requireAuth } = require('../middleware/authUnified');

// Listar itens do painel (filtros: prioridade, status, responsável)
router.get('/items', requireAuth, async (req, res) => {
  try {
    const { status, prioridade, responsavel } = req.query;
    const items = await CozinhaItem.list({ status, prioridade, responsavel });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar itens da cozinha', details: error.message });
  }
});

// Criar novo item (apenas pratos)
router.post('/items', requireAuth, async (req, res) => {
  try {
    const { comanda_id, product_id, quantidade, observacao, prioridade, responsavel } = req.body;
    if (!comanda_id || !product_id || !Number.isFinite(Number(quantidade)) || Number(quantidade) <= 0) {
      return res.status(400).json({ error: 'comanda_id, product_id e quantidade positiva são obrigatórios' });
    }
    if (prioridade && !['normal', 'urgente'].includes(prioridade)) {
      return res.status(400).json({ error: 'Prioridade inválida' });
    }

    const id = await CozinhaItem.create({
      comanda_id,
      product_id,
      quantidade: Number(quantidade),
      observacao: observacao || null,
      prioridade: prioridade || 'normal',
      responsavel: responsavel || null
    });
    res.status(201).json({ success: true, id });
  } catch (error) {
    if (error.message === 'Produto não requer preparo na cozinha') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro ao criar item da cozinha', details: error.message });
  }
});

// Atualizar status do item
router.put('/items/:id/status', requireAuth, async (req, res) => {
  const { status, responsavel } = req.body;
  await CozinhaItem.updateStatus(req.params.id, status, responsavel);
  res.json({ success: true });
});

// Consultar histórico de status do item
router.get('/items/:id/history', async (req, res) => {
  const history = await CozinhaItem.getHistory(req.params.id);
  res.json(history);
});

module.exports = router;
