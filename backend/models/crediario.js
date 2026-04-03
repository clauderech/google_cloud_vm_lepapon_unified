
const { db } = require('../config/knex');

const CrediarioModel = {
    async addMonthlyPayment(monthlyAccountId, paymentDate, amount, paymentMethod, receiptNumber, receivedBy, notes) {
      // Validações básicas
      if (!monthlyAccountId || !paymentDate || !amount || !paymentMethod) {
        throw new Error('Parâmetros obrigatórios ausentes');
      }
      
      if (amount <= 0) {
        throw new Error('Valor do pagamento deve ser positivo');
      }
      
      await db('monthly_payments').insert({
        monthly_account_id: parseInt(monthlyAccountId), // Garantir que é int
        payment_date: paymentDate,
        amount: parseFloat(amount), // Garantir que é decimal
        payment_method: paymentMethod,
        receipt_number: receiptNumber,
        received_by: receivedBy,
        notes
      });
      // Atualiza saldo, total e status da conta mensal
      await CrediarioModel.updateMonthlyAccountTotals(monthlyAccountId);
    },
  async findOrCreateMonthlyAccount(customerId, monthYear, dueDate) {
    // Validações básicas
    if (!customerId || !monthYear || !dueDate) {
      throw new Error('Parâmetros obrigatórios ausentes');
    }
    
    const customerIdInt = parseInt(customerId); // Garantir que é int conforme schema
    
    // Busca ou cria a conta mensal do cliente para o mês
    let acc = await db('monthly_accounts')
      .where({ customer_id: customerIdInt, month_year: monthYear })
      .first();
    if (!acc) {
      const [id] = await db('monthly_accounts').insert({
        customer_id: customerIdInt,
        month_year: monthYear,
        due_date: dueDate,
        status: 'open',
      });
      acc = await db('monthly_accounts').where({ id }).first();
    }
    return acc;
  },

  async addMonthlyPurchase(monthlyAccountId, saleId, purchaseDate, description, amount, itemsJson) {
      // Validações básicas
      if (!monthlyAccountId || !purchaseDate || !description || !amount) {
        throw new Error('Parâmetros obrigatórios ausentes');
      }
      
      if (amount <= 0) {
        throw new Error('Valor da compra deve ser positivo');
      }
      
      await db('monthly_purchases').insert({
        monthly_account_id: parseInt(monthlyAccountId), // Garantir que é int
        sale_id: saleId,
        purchase_date: purchaseDate,
        description,
        amount: parseFloat(amount), // Garantir que é decimal
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

    // ================================
    // MÉTODOS PARA INTEGRAÇÃO WHATSAPP
    // ================================

    async setCustomerWhatsApp(customerId, whatsappPhone) {
      if (!customerId || !whatsappPhone) {
        throw new Error('Customer ID e WhatsApp são obrigatórios');
      }
      
      // Remove caracteres não numéricos e valida formato básico
      const cleanPhone = whatsappPhone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new Error('Número WhatsApp inválido');
      }
      
      const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
      
      await db('customers').where({ id: customerId }).update({
        fone: formattedPhone
      });
      
      return formattedPhone;
    },

    async getCustomersWithWhatsApp() {
      return db('customers')
        .whereNotNull('fone')
        .where('fone', '!=', '')
        .select('id', 'nome', 'sobrenome', 'fone');
    },

    async getAccountsReadyToSend(filters = {}) {
      let query = db('monthly_accounts as ma')
        .leftJoin('customers as c', 'ma.customer_id', 'c.id')
        .where('ma.balance', '>', 0.01) // Apenas contas com saldo pendente
        .whereNotNull('c.fone')
        .where('c.fone', '!=', '');

      if (filters.status) {
        query = query.where('ma.status', filters.status);
      }

      if (filters.monthYear) {
        query = query.where('ma.month_year', filters.monthYear);
      }

      return query.select(
        'ma.*',
        'c.nome',
        'c.sobrenome', 
        'c.fone'
      ).orderBy('ma.due_date', 'asc');
    },

    async recordWhatsAppMessage(monthlyAccountId, customerId, whatsappPhone, messageType, messageContent, mediaUrl = null) {
      const [id] = await db('whatsapp_account_messages').insert({
        monthly_account_id: monthlyAccountId,
        customer_id: customerId,
        whatsapp_phone: whatsappPhone, // Cópia do campo 'fone' para histórico
        message_type: messageType,
        message_content: messageContent,
        media_url: mediaUrl,
        send_status: 'pending'
      });
      
      return id;
    },

    async updateMessageStatus(messageId, status, whatsappMessageId = null, errorDetails = null) {
      const updateData = {
        send_status: status,
        [`${status}_at`]: new Date()
      };
      
      if (whatsappMessageId) {
        updateData.whatsapp_message_id = whatsappMessageId;
      }
      
      if (errorDetails) {
        updateData.error_details = errorDetails;
      }
      
      await db('whatsapp_account_messages').where({ id: messageId }).update(updateData);
      
      // Se enviou com sucesso, atualiza a conta mensal
      if (status === 'sent') {
        await db('monthly_accounts').where({ id: (await db('whatsapp_account_messages').where({ id: messageId }).first()).monthly_account_id }).update({
          last_sent_at: new Date(),
          receipt_count: db.raw('receipt_count + 1'),
          status_whatsapp: 'sent'
        });
      }
    },

    async getMessageHistory(monthlyAccountId, limit = 50) {
      return db('whatsapp_account_messages')
        .where({ monthly_account_id: monthlyAccountId })
        .orderBy('created_at', 'desc')
        .limit(limit);
    },

    async getAccountsNeedingReminder() {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      return db('monthly_accounts as ma')
        .leftJoin('customers as c', 'ma.customer_id', 'c.id')
        .where('ma.status', 'overdue')
        .where('ma.balance', '>', 0.01)
        .whereNotNull('c.fone')
        .where('c.fone', '!=', '')
        .where(function() {
          this.whereNull('ma.last_sent_at')
            .orWhere('ma.last_sent_at', '<', sevenDaysAgo);
        })
        .select(
          'ma.*',
          'c.nome',
          'c.sobrenome', 
          'c.fone'
        )
        .orderBy('ma.due_date', 'asc');
    },

    async getAccountWithDetails(monthlyAccountId) {
      // Busca a conta mensal com dados do cliente
      const account = await db('monthly_accounts as ma')
        .leftJoin('customers as c', 'ma.customer_id', 'c.id')
        .where('ma.id', monthlyAccountId)
        .select(
          'ma.*',
          'c.nome',
          'c.sobrenome',
          'c.fone'
        )
        .first();

      if (!account) {
        throw new Error('Conta mensal não encontrada');
      }

      // Busca as compras do mês
      const purchases = await db('monthly_purchases')
        .where({ monthly_account_id: monthlyAccountId })
        .orderBy('purchase_date', 'desc');

      // Busca os pagamentos realizados
      const payments = await db('monthly_payments')
        .where({ monthly_account_id: monthlyAccountId })
        .orderBy('payment_date', 'desc');

      return {
        ...account,
        purchases,
        payments
      };
    }

};

module.exports = CrediarioModel;
