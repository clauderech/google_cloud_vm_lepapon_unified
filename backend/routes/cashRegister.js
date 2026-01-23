'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../config/knex');

// Abrir caixa
router.post('/open', async (req, res) => {
  // Aceita tanto camelCase quanto snake_case
  const initial_amount = req.body.initial_amount ?? req.body.initialAmount;
  const opened_by = req.body.opened_by ?? req.body.openedBy;
  try {
    console.log('[CAIXA][OPEN][REQ]', { payload: req.body });
    const caixaAberto = await db('cash_registers').whereNull('closed_at').first();
    console.log('[CAIXA][OPEN][QUERY] caixaAberto:', caixaAberto);
    if (caixaAberto) {
      console.warn('[CAIXA][OPEN][WARN] Já existe caixa aberto:', caixaAberto);
      return res.status(400).json({ error: 'Já existe um caixa aberto', caixaAberto });
    }
    if (initial_amount == null || opened_by == null) {
      return res.status(400).json({ error: 'initial_amount e opened_by são obrigatórios' });
    }
    const [id] = await db('cash_registers').insert({
      date: db.raw('CURDATE()'),
      initial_amount,
      opened_by,
      opened_at: db.fn.now()
    });
    console.log('[CAIXA][OPEN][RESULT]', { id, initial_amount, opened_by, timestamp: new Date().toISOString() });
    res.json({ registerId: id });
  } catch (err) {
    console.error('[CAIXA][OPEN][ERROR]', { payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao abrir caixa', details: err.message, stack: err.stack });
  }
});

// Fechar caixa
router.post('/close', async (req, res) => {
  const { id, final_amount, closed_by, notes } = req.body;
  try {
    console.log('[CAIXA][CLOSE][REQ]', { payload: req.body });
    const caixa = await db('cash_registers').where({ id }).whereNull('closed_at').first();
    console.log('[CAIXA][CLOSE][QUERY] caixa:', caixa);
    if (!caixa) {
      console.warn('[CAIXA][CLOSE][WARN] Caixa não encontrado ou já fechado:', id);
      return res.status(404).json({ error: 'Caixa não encontrado ou já fechado' });
    }
    await db('cash_registers').where({ id }).update({
      final_amount,
      closed_by,
      closed_at: db.fn.now(),
      notes
    });
    console.log('[CAIXA][CLOSE][RESULT]', { id, final_amount, closed_by, notes, timestamp: new Date().toISOString() });
    const result = await db('cash_registers').where({ id }).first();
    res.json({ result });
  } catch (err) {
    console.error('[CAIXA][CLOSE][ERROR]', { payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao fechar caixa', details: err.message, stack: err.stack });
  }
});

// Consultar caixa atual
router.get('/current', async (req, res) => {
  try {
    console.log('[CAIXA][CURRENT][REQ]');
    const caixa = await db('cash_registers').whereNull('closed_at').first();
    console.log('[CAIXA][CURRENT][RESULT]', caixa);
    if (caixa) {
      res.json({ ...caixa, status: 'open' });
    } else {
      res.json(null);
    }
  } catch (err) {
    console.error('[CAIXA][CURRENT][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao consultar caixa atual', details: err.message, stack: err.stack });
  }
});

// Histórico de caixas
router.get('/history', async (req, res) => {
  const days = Number(req.query.days) || 30;
  try {
    console.log('[CAIXA][HISTORY][REQ]', { days });
    const caixas = await db('cash_registers')
      .where('date', '>=', db.raw(`CURDATE() - INTERVAL ${days} DAY`))
      .orderBy('date', 'desc');
    console.log('[CAIXA][HISTORY][RESULT]', caixas);
    res.json(caixas);
  } catch (err) {
    console.error('[CAIXA][HISTORY][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao consultar histórico de caixas', details: err.message, stack: err.stack });
  }
});

// Listar movimentações do caixa
router.get('/:id/movements', async (req, res) => {
  try {
    console.log('[CAIXA][MOVEMENTS][REQ]', { caixaId: req.params.id });
    const movimentos = await db('cash_movements').where({ cash_register_id: req.params.id }).orderBy('created_at', 'desc');
    console.log('[CAIXA][MOVEMENTS][RESULT]', movimentos);
    res.json(movimentos);
  } catch (err) {
    console.error('[CAIXA][MOVEMENTS][ERROR]', { caixaId: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao consultar movimentações', details: err.message, stack: err.stack });
  }
});

// Adicionar movimentação ao caixa
router.post('/:id/movements', async (req, res) => {
  const { type, amount, description } = req.body;
  try {
    console.log('[CAIXA][ADD_MOVEMENT][REQ]', { caixaId: req.params.id, payload: req.body });
    const caixa = await db('cash_registers').where({ id: req.params.id }).whereNull('closed_at').first();
    console.log('[CAIXA][ADD_MOVEMENT][QUERY] caixa:', caixa);
    if (!caixa) {
      console.warn('[CAIXA][ADD_MOVEMENT][WARN] Caixa não encontrado ou já fechado:', req.params.id);
      return res.status(404).json({ error: 'Caixa não encontrado ou já fechado' });
    }
    const [movId] = await db('cash_movements').insert({
      cash_register_id: req.params.id,
      type,
      amount,
      description,
      created_at: db.fn.now()
    });
    console.log('[CAIXA][ADD_MOVEMENT][RESULT]', { movId, type, amount, description, caixaId: req.params.id, timestamp: new Date().toISOString() });
    const movimento = await db('cash_movements').where({ id: movId }).first();
    res.json(movimento);
  } catch (err) {
    console.error('[CAIXA][ADD_MOVEMENT][ERROR]', { payload: req.body, caixaId: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao adicionar movimentação', details: err.message, stack: err.stack });
  }
});

module.exports = router;
