'use strict';

const { db } = require('../config/knex');

const CrediarioModel = {
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
    return db('monthly_purchases').insert({
      monthly_account_id: monthlyAccountId,
      sale_id: saleId,
      purchase_date: purchaseDate,
      description,
      amount,
      items_json: itemsJson
    });
  }
};

module.exports = CrediarioModel;
