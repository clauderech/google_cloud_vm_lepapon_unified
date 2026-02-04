'use strict';

import { db } from '../config/knex';

const CashModel = {
  async getCurrentRegister() {
    // Caixa aberto mais recente (onde closed_at é null)
    return db('cash_registers').whereNull('closed_at').orderBy('opened_at', 'desc').first();
  },
  async addMovement({ registerId, type, amount, paymentMethod, description }) {
    return db('cash_movements').insert({
      cash_register_id: registerId,
      type,
      amount,
      payment_method: paymentMethod,
      description
    });
  }
};

export default CashModel;
