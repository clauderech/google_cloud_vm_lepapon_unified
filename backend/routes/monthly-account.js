'use strict';

const express = require('express');
const router = express.Router();

/**
 * Rotas para gerenciar crediário mensal (modelo caderno)
 * Sistema onde cliente acumula compras durante o mês e paga no final
 */

/**
 * GET /api/monthly-account/dashboard
 * Retorna estatísticas gerais do crediário mensal
 */
router.get('/api/monthly-account/dashboard', async (req, res) => {
  try {
    const db = req.db;
    
    // Total de contas ativas
    const activeAccounts = await db('monthly_accounts')
      .where('status', 'open')
      .orWhere('status', 'closed')
      .count('* as count')
      .first();

    // Total a receber
    const totalToReceive = await db('monthly_accounts')
      .whereIn('status', ['open', 'closed', 'overdue'])
      .sum('balance as total')
      .first();

    // Contas vencidas
    const overdueAccounts = await db('monthly_accounts')
      .where('status', 'overdue')
      .count('* as count')
      .first();

    // Total em atraso
    const overdueAmount = await db('monthly_accounts')
      .where('status', 'overdue')
      .sum('balance as total')
      .first();

    // Contas do mês atual
    const currentMonth = new Date().toISOString().slice(0, 7); // '2026-01'
    const currentMonthAccounts = await db('monthly_accounts')
      .where('month_year', currentMonth)
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        activeAccounts: activeAccounts.count || 0,
        totalToReceive: parseFloat(totalToReceive.total || 0),
        overdueAccounts: overdueAccounts.count || 0,
        overdueAmount: parseFloat(overdueAmount.total || 0),
        currentMonthAccounts: currentMonthAccounts.count || 0
      }
    });

  } catch (error) {
    console.error('[API] Erro ao buscar dashboard:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas'
    });
  }
});

/**
 * GET /api/monthly-account
 * Lista todas as contas mensais com filtros
 * Query params: status, customer_id, month_year
 */
router.get('/api/monthly-account', async (req, res) => {
  try {
    const db = req.db;
    const { status, customer_id, month_year } = req.query;

    let query = db('monthly_accounts')
      .leftJoin('customers', 'monthly_accounts.customer_id', 'customers.id')
      .select(
        'monthly_accounts.*',
        'customers.nome as customer_nome',
        'customers.sobrenome as customer_sobrenome',
        'customers.fone as customer_fone'
      )
      .orderBy('monthly_accounts.created_at', 'desc');

    if (status) {
      query = query.where('monthly_accounts.status', status);
    }

    if (customer_id) {
      query = query.where('monthly_accounts.customer_id', customer_id);
    }

    if (month_year) {
      query = query.where('monthly_accounts.month_year', month_year);
    }

    const accounts = await query;

    // Formatar resposta
    const formattedAccounts = accounts.map(account => ({
      ...account,
      customer_name: `${account.customer_nome} ${account.customer_sobrenome || ''}`.trim()
    }));

    res.json({
      success: true,
      count: formattedAccounts.length,
      data: formattedAccounts
    });

  } catch (error) {
    console.error('[API] Erro ao listar contas:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao listar contas mensais'
    });
  }
});

/**
 * GET /api/monthly-account/:id
 * Retorna detalhes de uma conta mensal específica com compras e pagamentos
 */
router.get('/api/monthly-account/:id', async (req, res) => {
  try {
    const db = req.db;
    const accountId = parseInt(req.params.id);

    // Buscar conta
    const account = await db('monthly_accounts')
      .leftJoin('customers', 'monthly_accounts.customer_id', 'customers.id')
      .select(
        'monthly_accounts.*',
        'customers.nome as customer_nome',
        'customers.sobrenome as customer_sobrenome',
        'customers.fone as customer_fone'
      )
      .where('monthly_accounts.id', accountId)
      .first();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }

    // Buscar compras
    const purchases = await db('monthly_purchases')
      .where('monthly_account_id', accountId)
      .orderBy('purchase_date', 'asc');

    // Buscar pagamentos
    const payments = await db('monthly_payments')
      .where('monthly_account_id', accountId)
      .orderBy('payment_date', 'desc');

    res.json({
      success: true,
      data: {
        ...account,
        customer_name: `${account.customer_nome} ${account.customer_sobrenome || ''}`.trim(),
        purchases,
        payments
      }
    });

  } catch (error) {
    console.error('[API] Erro ao buscar conta:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar detalhes da conta'
    });
  }
});

/**
 * POST /api/monthly-account/add-purchase
 * Adiciona uma compra ao crediário mensal do cliente
 * Body: { customer_id, amount, description, items, sale_id? }
 */
router.post('/api/monthly-account/add-purchase', async (req, res) => {
  try {
    const db = req.db;
    const { customer_id, amount, description, items, sale_id } = req.body;

    if (!customer_id || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'customer_id, amount e description são obrigatórios'
      });
    }

    // Verificar se cliente existe
    const customer = await db('customers').where('id', customer_id).first();
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente não encontrado'
      });
    }

    // Obter mês/ano atual
    const currentDate = new Date();
    const month_year = currentDate.toISOString().slice(0, 7); // '2026-01'

    // Buscar ou criar conta mensal
    let account = await db('monthly_accounts')
      .where('customer_id', customer_id)
      .where('month_year', month_year)
      .first();

    if (!account) {
      // Criar nova conta para o mês
      const [accountId] = await db('monthly_accounts').insert({
        customer_id,
        month_year,
        total_amount: 0,
        amount_paid: 0,
        balance: 0,
        status: 'open',
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      account = await db('monthly_accounts').where('id', accountId).first();
    }

    // Adicionar compra
    await db('monthly_purchases').insert({
      monthly_account_id: account.id,
      sale_id,
      purchase_date: currentDate,
      description,
      amount: parseFloat(amount),
      items_json: items ? JSON.stringify(items) : null,
      created_at: db.fn.now()
    });

    // Atualizar totais da conta
    const newTotal = parseFloat(account.total_amount) + parseFloat(amount);
    const newBalance = newTotal - parseFloat(account.amount_paid);

    await db('monthly_accounts')
      .where('id', account.id)
      .update({
        total_amount: newTotal,
        balance: newBalance,
        updated_at: db.fn.now()
      });

    console.log(`[API] Compra adicionada ao crediário. Cliente: ${customer_id}, Valor: R$ ${amount}`);

    res.json({
      success: true,
      message: 'Compra adicionada ao crediário',
      data: {
        account_id: account.id,
        month_year,
        new_total: newTotal,
        new_balance: newBalance
      }
    });

  } catch (error) {
    console.error('[API] Erro ao adicionar compra:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao adicionar compra ao crediário'
    });
  }
});

/**
 * POST /api/monthly-account/:id/close-month
 * Fecha o mês e gera o "boleto" (define vencimento)
 * Body: { due_date, notes? }
 */
router.post('/api/monthly-account/:id/close-month', async (req, res) => {
  try {
    const db = req.db;
    const accountId = parseInt(req.params.id);
    const { due_date, notes } = req.body;

    if (!due_date) {
      return res.status(400).json({
        success: false,
        error: 'due_date é obrigatório'
      });
    }

    const account = await db('monthly_accounts').where('id', accountId).first();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }

    if (account.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Esta conta já foi fechada'
      });
    }

    // Fechar mês
    await db('monthly_accounts')
      .where('id', accountId)
      .update({
        status: 'closed',
        due_date,
        notes: notes || account.notes,
        updated_at: db.fn.now()
      });

    console.log(`[API] Mês fechado. Conta: ${accountId}, Vencimento: ${due_date}`);

    res.json({
      success: true,
      message: 'Mês fechado com sucesso',
      data: {
        account_id: accountId,
        due_date,
        total_amount: account.total_amount,
        balance: account.balance
      }
    });

  } catch (error) {
    console.error('[API] Erro ao fechar mês:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao fechar mês'
    });
  }
});

/**
 * POST /api/monthly-account/:id/payment
 * Registra pagamento na conta mensal
 * Body: { amount, payment_method, receipt_number?, received_by?, notes? }
 */
router.post('/api/monthly-account/:id/payment', async (req, res) => {
  try {
    const db = req.db;
    const accountId = parseInt(req.params.id);
    const { amount, payment_method, receipt_number, received_by, notes } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'amount e payment_method são obrigatórios'
      });
    }

    const account = await db('monthly_accounts').where('id', accountId).first();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }

    // Registrar pagamento
    await db('monthly_payments').insert({
      monthly_account_id: accountId,
      payment_date: db.fn.now(),
      amount: parseFloat(amount),
      payment_method,
      receipt_number,
      received_by,
      notes,
      created_at: db.fn.now()
    });

    // Atualizar saldo da conta
    const newAmountPaid = parseFloat(account.amount_paid) + parseFloat(amount);
    const newBalance = parseFloat(account.total_amount) - newAmountPaid;
    
    let newStatus = account.status;
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (account.status === 'overdue') {
      newStatus = 'closed'; // Volta para closed se pagou algo
    }

    await db('monthly_accounts')
      .where('id', accountId)
      .update({
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payment_date: newBalance <= 0 ? db.fn.now() : account.payment_date,
        updated_at: db.fn.now()
      });

    console.log(`[API] Pagamento registrado. Conta: ${accountId}, Valor: R$ ${amount}`);

    res.json({
      success: true,
      message: 'Pagamento registrado com sucesso',
      data: {
        account_id: accountId,
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        is_paid: newBalance <= 0
      }
    });

  } catch (error) {
    console.error('[API] Erro ao registrar pagamento:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao registrar pagamento'
    });
  }
});

/**
 * PUT /api/monthly-account/:id/update-overdue
 * Atualiza status de contas vencidas (deve ser executado por cronjob diário)
 */
router.put('/api/monthly-account/:id/update-overdue', async (req, res) => {
  try {
    const db = req.db;
    const accountId = parseInt(req.params.id);

    const account = await db('monthly_accounts').where('id', accountId).first();

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Conta não encontrada'
      });
    }

    const today = new Date();
    const dueDate = new Date(account.due_date);

    if (account.status === 'closed' && dueDate < today && account.balance > 0) {
      await db('monthly_accounts')
        .where('id', accountId)
        .update({
          status: 'overdue',
          updated_at: db.fn.now()
        });

      res.json({
        success: true,
        message: 'Status atualizado para vencido'
      });
    } else {
      res.json({
        success: true,
        message: 'Nenhuma atualização necessária'
      });
    }

  } catch (error) {
    console.error('[API] Erro ao atualizar status:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar status'
    });
  }
});

module.exports = router;
