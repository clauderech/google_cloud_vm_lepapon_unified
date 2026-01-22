'use strict';

const express = require('express');
const router = express.Router();

/**
 * Rotas de Gestão Financeira
 * - Abertura/Fechamento de Caixa
 * - Despesas
 * - Ativos Diários
 */

/**
 * POST /api/cash-register/open
 * Abre um novo caixa
 */
router.post('/api/cash-register/open', async (req, res) => {
  try {
    const db = req.db;
    const { initialAmount, openedBy } = req.body;

    if (initialAmount < 0) {
      return res.status(400).json({ error: 'Valor inicial não pode ser negativo' });
    }

    if (!openedBy || !openedBy.trim()) {
      return res.status(400).json({ error: 'Responsável pela abertura é obrigatório' });
    }

    // Verificar se há caixa aberto no dia
    const today = new Date().toISOString().split('T')[0];
    const existingRegister = await db('cash_registers')
      .where('date', 'like', `${today}%`)
      .where('closed_at', null)
      .first();

    if (existingRegister) {
      return res.status(400).json({ 
        error: 'Já existe um caixa aberto hoje. Feche-o antes de abrir outro.' 
      });
    }

    // Criar novo registro de caixa
    const now = new Date();
    const dateOnly = now.toISOString().split('T')[0]; // Formato: YYYY-MM-DD
    
    const [id] = await db('cash_registers').insert({
      date: dateOnly,
      initial_amount: initialAmount,
      opened_by: openedBy,
      opened_at: now,  // Deixar como Date object - Knex/MySQL2 converte corretamente
      closed_at: null,
      closed_by: null,
      final_amount: null,
      notes: null
    });

    res.json({
      success: true,
      registerId: id,
      message: 'Caixa aberto com sucesso'
    });

  } catch (error) {
    console.error('[Financial] Erro ao abrir caixa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao abrir caixa',
      message: error.message
    });
  }
});

/**
 * GET /api/cash-register/current
 * Retorna o caixa aberto atualmente
 */
router.get('/api/cash-register/current', async (req, res) => {
  try {
    const db = req.db;

    const register = await db('cash_registers')
      .where('closed_at', null)
      .first();

    if (!register) {
      return res.json({
        success: true,
        data: null,
        message: 'Nenhum caixa aberto'
      });
    }

    // Buscar movimentações do caixa
    const movements = await db('cash_movements')
      .where('cash_register_id', register.id)
      .orderBy('created_at', 'desc');

    // Calcular totais
    const totalSales = movements
      .filter(m => m.type === 'sale')
      .reduce((acc, m) => acc + (m.amount || 0), 0);

    const totalExpenses = movements
      .filter(m => m.type === 'expense')
      .reduce((acc, m) => acc + (m.amount || 0), 0);

    const expectedAmount = register.initial_amount + totalSales - totalExpenses;

    res.json({
      success: true,
      id: register.id,
      date: register.date,
      initialAmount: register.initial_amount,
      openedBy: register.opened_by,
      responsibleUser: register.opened_by,
      openedAt: register.opened_at,
      closedAt: register.closed_at,
      closedBy: register.closed_by,
      expectedAmount,
      totalSales,
      totalExpenses,
      movements,
      actualAmount: register.final_amount,
      difference: register.final_amount ? (register.final_amount - expectedAmount) : null,
      status: register.closed_at ? 'closed' : 'open'
    });

  } catch (error) {
    console.error('[Financial] Erro ao buscar caixa atual:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar caixa',
      message: error.message
    });
  }
});

/**
 * POST /api/cash-register/close
 * Fecha o caixa aberto
 */
router.post('/api/cash-register/close', async (req, res) => {
  try {
    const db = req.db;
    const { registerId, actualAmount, closedBy, notes } = req.body;

    if (actualAmount < 0) {
      return res.status(400).json({ error: 'Valor final não pode ser negativo' });
    }

    if (!closedBy || !closedBy.trim()) {
      return res.status(400).json({ error: 'Responsável pelo fechamento é obrigatório' });
    }

    // Buscar registro
    const register = await db('cash_registers')
      .where('id', registerId)
      .first();

    if (!register) {
      return res.status(404).json({ error: 'Caixa não encontrado' });
    }

    if (register.closed_at) {
      return res.status(400).json({ error: 'Este caixa já foi fechado' });
    }

    // Atualizar registro
    await db('cash_registers')
      .where('id', registerId)
      .update({
        final_amount: actualAmount,
        closed_by: closedBy,
        closed_at: new Date(),  // Deixar como Date object - Knex/MySQL2 converte corretamente
        notes: notes || null
      });

    res.json({
      success: true,
      message: 'Caixa fechado com sucesso'
    });

  } catch (error) {
    console.error('[Financial] Erro ao fechar caixa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao fechar caixa',
      message: error.message
    });
  }
});

/**
 * GET /api/cash-register/history
 * Retorna histórico de caixas
 */
router.get('/api/cash-register/history', async (req, res) => {
  try {
    const db = req.db;
    const days = parseInt(req.query.days || '30', 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const registers = await db('cash_registers')
      .where('date', '>=', startDate.toISOString())
      .orderBy('date', 'desc');

    res.json({
      success: true,
      data: registers
    });

  } catch (error) {
    console.error('[Financial] Erro ao buscar histórico:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar histórico',
      message: error.message
    });
  }
});

/**
 * POST /api/expenses
 * Registra uma despesa
 */
router.post('/api/expenses', async (req, res) => {
  try {
    const db = req.db;
    const { description, amount, category, paymentMethod } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    const [id] = await db('expenses').insert({
      description,
      amount,
      category,
      payment_method: paymentMethod,
      date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      expenseId: id,
      message: 'Despesa registrada'
    });

  } catch (error) {
    console.error('[Financial] Erro ao registrar despesa:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar despesa',
      message: error.message
    });
  }
});

/**
 * GET /api/expenses
 * Lista despesas com filtros
 */
router.get('/api/expenses', async (req, res) => {
  try {
    const db = req.db;
    const { startDate, endDate, category } = req.query;

    let query = db('expenses');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    if (category) {
      query = query.where('category', category);
    }

    const expenses = await query.orderBy('date', 'desc');

    res.json({
      success: true,
      data: expenses
    });

  } catch (error) {
    console.error('[Financial] Erro ao buscar despesas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar despesas',
      message: error.message
    });
  }
});

/**
 * GET /api/daily-assets
 * Retorna ativos do dia
 */
router.get('/api/daily-assets', async (req, res) => {
  try {
    const db = req.db;
    const today = new Date().toISOString().split('T')[0];

    const [result] = await db.raw(`
      SELECT 
        ? as date,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE -amount END), 0) as net
      FROM cash_movements
      WHERE DATE(created_at) = ?
    `, [today, today]);

    res.json({
      success: true,
      data: result || {
        date: today,
        sales: 0,
        expenses: 0,
        net: 0
      }
    });

  } catch (error) {
    console.error('[Financial] Erro ao buscar ativos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ativos',
      message: error.message
    });
  }
});

module.exports = router;
