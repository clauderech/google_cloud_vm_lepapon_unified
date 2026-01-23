'use strict';

const { db } = require('../config/knex');

const CashModel = {
  async getCurrentRegister() {
    // Caixa aberto mais recente
    return db('cash_registers').where({ status: 'open' }).orderBy('opened_at', 'desc').first();
  },
  async addMovement({ registerId, type, referenceType, referenceId, amount, paymentMethod, description }) {
    return db('cash_movements').insert({
      cash_register_id: registerId,
      type,
      reference_type: referenceType,
      reference_id: referenceId,
      amount,
      payment_method: paymentMethod,
      description
    });
  }
};

module.exports = CashModel;
