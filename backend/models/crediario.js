'use strict';

const { db } = require('../config/knex');

const CrediarioModel = {
    async addMonthlyPayment(monthlyAccountId, paymentDate, amount, paymentMethod, receiptNumber, receivedBy, notes) {
      await db('monthly_payments').insert({
        monthly_account_id: monthlyAccountId,
        payment_date: paymentDate,
        amount,
        payment_method: paymentMethod,
        receipt_number: receiptNumber,
        received_by: receivedBy,
        notes
      });
      // Atualiza saldo, total e status da conta mensal
      await CrediarioModel.updateMonthlyAccountTotals(monthlyAccountId);
    },
  async findOrCreateMonthlyAccount(customerId, monthYear, dueDate) {
    // Busca ou cria a conta mensal do cliente para o mês
    let acc = await db('monthly_accounts')
      .where({ customer_id: customerId, month_year: monthYear })
      .first();
    if (!acc) {
      const [id] = await db('monthly_accounts').insert({
        customer_id: customerId,
        month_year: monthYear,
        due_date: dueDate,
        status: 'open',
      });
      acc = await db('monthly_accounts').where({ id }).first();
    }
    return acc;
  },

  async addMonthlyPurchase(monthlyAccountId, saleId, purchaseDate, description, amount, itemsJson) {
      await db('monthly_purchases').insert({
        monthly_account_id: monthlyAccountId,
        sale_id: saleId,
        purchase_date: purchaseDate,
        description,
        amount,
        items_json: itemsJson
      });
      // Atualiza saldo, total e status da conta mensal
      await CrediarioModel.updateMonthlyAccountTotals(monthlyAccountId);
    },

    async updateMonthlyAccountTotals(monthlyAccountId) {
      // Soma todas as compras
      const purchases = await db('monthly_purchases').where({ monthly_account_id: monthlyAccountId });
      const totalAmount = purchases.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      // Soma todos os pagamentos
      const payments = await db('monthly_payments').where({ monthly_account_id: monthlyAccountId });
      const amountPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const balance = totalAmount - amountPaid;
      // Atualiza status
      let status = 'open';
      if (balance <= 0 && totalAmount > 0) status = 'paid';
      else if (balance > 0) {
        // Verifica vencimento
        const acc = await db('monthly_accounts').where({ id: monthlyAccountId }).first();
        const today = new Date();
        if (acc && acc.due_date && new Date(acc.due_date) < today) status = 'overdue';
      }
      await db('monthly_accounts').where({ id: monthlyAccountId }).update({
        total_amount: totalAmount,
        amount_paid: amountPaid,
        balance,
        status
      });
    },

};

module.exports = CrediarioModel;
