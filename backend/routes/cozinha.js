const express = require('express');
const router = express.Router();
const CozinhaItem = require('../models/cozinha_item');

// Listar itens do painel (filtros: prioridade, status, responsável)
router.get('/items', async (req, res) => {
  const { status, prioridade, responsavel } = req.query;
  const items = await CozinhaItem.list({ status, prioridade, responsavel });
  res.json(items);
});

// Criar novo item (apenas pratos)
router.post('/items', async (req, res) => {
  const { comanda_id, product_id, quantidade, observacao, prioridade, responsavel } = req.body;
  // Aqui você pode validar se o product_id é do tipo "prato" antes de inserir
  const id = await CozinhaItem.create({ comanda_id, product_id, quantidade, observacao, prioridade, responsavel });
  res.status(201).json({ success: true, id });
});

// Atualizar status do item
router.put('/items/:id/status', async (req, res) => {
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
