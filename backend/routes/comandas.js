const CashModel = require('../models/cash');
const express = require('express');
const router = express.Router();
const SaleModel = require('../models/sale');
const SaleItemModel = require('../models/sale_item');
const ProductModel = require('../models/product');
const CrediarioModel = require('../models/crediario');
// Finalizar comanda (pagamento normal ou crediário)
router.post('/:id/close', async (req, res) => {
  /*
    Espera body:
    {
      paymentMethod: 'cash' | 'card' | 'pix' | 'credit' | 'crediario',
      closeDate?: string (opcional, default: now)
    }
  */
  try {
    const comandaId = req.params.id;
    const { paymentMethod, closeDate } = req.body;
    const comanda = await ComandaModel.getById(comandaId);
    if (!comanda) return res.status(404).json({ error: 'Comanda não encontrada' });
    if (comanda.status === 'closed') return res.status(400).json({ error: 'Comanda já está fechada' });
    const items = await ComandaModel.getItems(comandaId);
    if (!items || items.length === 0) return res.status(400).json({ error: 'Comanda sem itens' });

    // Calcula total
    const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);

    // Atualiza comanda para fechada
    await ComandaModel.update(comandaId, {
      status: 'closed',
      payment_method: paymentMethod,
      closed_at: closeDate ? formatDateForMySQL(closeDate) : formatDateForMySQL(new Date()),
      total
    });
// Utilitário para formatar datas no padrão MySQL DATETIME
function formatDateForMySQL(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0') + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0') + ':' +
    String(d.getSeconds()).padStart(2, '0');
}


    // Se for crediário (venda a prazo), registra no crediário
    if (paymentMethod === 'crediario' || paymentMethod === 'credit') {
      // Descobre mês/ano e data de vencimento (exemplo: último dia do mês)
      const now = new Date();
      const monthYear = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // último dia do mês

      // Cria ou busca conta mensal
      const acc = await CrediarioModel.findOrCreateMonthlyAccount(comanda.customer_id, monthYear, dueDate);

      // Registra a compra vinculada à conta mensal
      await CrediarioModel.addMonthlyPurchase(
        acc.id,
        null, // saleId ainda não existe
        formatDateForMySQL(now),
        `Comanda ${comandaId}`,
        total,
        JSON.stringify(items)
      );

      return res.json({ success: true, comandaId, total, crediario: true });
    }

    // Gera venda (sales)
    const saleData = {
      date: closeDate ? formatDateForMySQL(closeDate) : formatDateForMySQL(new Date()),
      total,
      discount: 0,
      payment_method: paymentMethod,
      customer_id: comanda.customer_id,
      customer_name: comanda.customer_name
    };
    const [saleId] = await SaleModel.create(saleData);

    // Salva itens em sale_items
    await SaleItemModel.addItems(saleId, items);

    // Registrar movimento de entrada no caixa
    const cashRegister = await CashModel.getCurrentRegister();
    if (cashRegister) {
      await CashModel.addMovement({
        registerId: cashRegister.id,
        type: 'entrada',
        amount: total,
        paymentMethod,
        description: `Venda comanda ${comandaId}`
      });
    }

    // Atualiza estoque dos produtos
    for (const item of items) {
      const productId = item.product_id || item.productId;
      const quantity = parseFloat(item.quantity);
      if (productId && !isNaN(quantity)) {
        const product = await ProductModel.getById(productId);
        if (product) {
          const newStock = (parseFloat(product.stock) || 0) - quantity;
          await ProductModel.update(productId, { stock: newStock });
        }
      }
    }

    res.json({ success: true, comandaId, saleId, total });
  } catch (err) {
    console.error('[COMANDA][CLOSE][ERROR]', { id: req.params.id, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao fechar comanda', details: err.message, stack: err.stack });
  }
});
'use strict';

const ComandaModel = require('../models/comanda');

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
    console.log('[COMANDA][OPEN][INFO]', {
      id: req.params.id,
      user: req.user ? req.user.id : undefined,
      timestamp: new Date().toISOString()
    });
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
    console.log('[COMANDA][CREATE][REQ]', { payload: req.body });
    const result = await ComandaModel.create(req.body);
    console.log('[COMANDA][CREATE][RESULT]', { result });
    res.status(201).json({ success: true, id: result[0] });
  } catch (err) {
    console.error('[COMANDA][CREATE][ERROR]', { payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao criar comanda', details: err.message, stack: err.stack });
  }
});

// Atualizar comanda
router.put('/:id', async (req, res) => {
  try {
    console.log('[COMANDA][UPDATE][REQ]', { id: req.params.id, payload: req.body });
    // Atualiza dados da comanda (exceto itens)
    const { items, ...comandaData } = req.body;
    if (Object.keys(comandaData).length > 0) {
      await ComandaModel.update(req.params.id, comandaData);
    }
    // Atualiza itens da comanda se enviados
    if (Array.isArray(items)) {
      // Remove itens antigos e insere novos (simples)
      await ComandaModel.clearItems(req.params.id);
      await ComandaModel.addItems(req.params.id, items);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[COMANDA][UPDATE][ERROR]', { id: req.params.id, payload: req.body, error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao atualizar comanda', details: err.message, stack: err.stack });
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

// Registrar pagamento mensal de crediário
router.post('/crediario/:monthlyAccountId/pay', async (req, res) => {
  /*
    Espera body:
    {
      paymentDate: string (YYYY-MM-DD ou timestamp),
      amount: number,
      paymentMethod: 'cash' | 'card' | 'pix' | 'transfer',
      receiptNumber?: string,
      receivedBy?: string,
      notes?: string
    }
  */
  try {
    const { monthlyAccountId } = req.params;
    const { paymentDate, amount, paymentMethod, receiptNumber, receivedBy, notes } = req.body;
    if (!paymentDate || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }
    await CrediarioModel.addMonthlyPayment(
      monthlyAccountId,
      paymentDate,
      amount,
      paymentMethod,
      receiptNumber,
      receivedBy,
      notes
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[CREDIARIO][MONTHLY][PAY][ERROR]', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro ao registrar pagamento mensal', details: err.message });
  }
});

// Consultar contas mensais de crediário
router.get('/crediario/accounts', async (req, res) => {
  try {
    const { customerId, monthYear } = req.query;
    const db = require('../config/knex').db;
    let query = db('monthly_accounts')
      .join('customers', 'monthly_accounts.customer_id', 'customers.id')
      .select('monthly_accounts.*', 'customers.nome as customer_name');
    if (customerId) query = query.where('monthly_accounts.customer_id', customerId);
    if (monthYear) query = query.where('monthly_accounts.month_year', monthYear);
    const accounts = await query.orderBy('monthly_accounts.due_date', 'desc');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar contas mensais', details: err.message });
  }
});

// Consultar compras mensais de crediário
router.get('/crediario/:monthlyAccountId/purchases', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const db = require('../config/knex').db;
    const purchases = await db('monthly_purchases').where('monthly_account_id', monthlyAccountId).orderBy('purchase_date', 'desc');
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar compras mensais', details: err.message });
  }
});

// Consultar pagamentos mensais de crediário
router.get('/crediario/:monthlyAccountId/payments', async (req, res) => {
  try {
    const { monthlyAccountId } = req.params;
    const db = require('../config/knex').db;
    const payments = await db('monthly_payments').where('monthly_account_id', monthlyAccountId).orderBy('payment_date', 'desc');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar pagamentos mensais', details: err.message });
  }
});

module.exports = router;
