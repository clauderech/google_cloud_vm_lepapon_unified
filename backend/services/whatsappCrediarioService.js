const ReceiptImageService = require('./receiptImageService');
const { sendTextMessage } = require('./whatsappCloudApi');
const { db } = require('../config/knex');

/**
 * Serviço para enviar contas mensais de crediário via WhatsApp
 * Data: 3 de abril de 2026
 */

class WhatsAppCrediarioService {
  constructor() {
    this.receiptService = ReceiptImageService.getInstance();
    this.rateLimitQueue = [];
    this.isProcessingQueue = false;
    this.maxRequestsPerMinute = 5;
  }

  /**
   * Envia uma conta mensal via WhatsApp
   * @param {number} monthlyAccountId - ID da conta mensal
   * @param {Object} options - Opções de envio
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendAccountReceipt(monthlyAccountId, options = {}) {
    try {
      const {
        messageType = 'account_receipt',
        forceRegenerate = false,
        includeImageCaption = true
      } = options;

      // Buscar dados completos da conta
      const CrediarioModel = require('../models/crediario');
      const accountData = await CrediarioModel.getAccountWithDetails(monthlyAccountId);

      // Validações
      if (accountData.balance <= 0 && accountData.status === 'paid') {
        throw new Error('Conta já está quitada');
      }

      if (!accountData.fone) {
        throw new Error('Cliente não possui telefone cadastrado');
      }

      // Gerar imagem da conta
      const imagePath = await this.receiptService.generateReceiptImage(accountData, {
        format: 'png',
        forceRegenerate
      });

      // Preparar mensagem de texto que acompanha a imagem
      const messageText = this.buildReceiptMessage(accountData, messageType);

      // Registrar tentativa de envio no banco
      const messageId = await CrediarioModel.recordWhatsAppMessage(
        monthlyAccountId,
        accountData.customer_id,
        accountData.fone,
        messageType,
        messageText,
        imagePath
      );

      // Enviar via WhatsApp (usando rate limiting)
      const whatsappResponse = await this.sendWithRateLimit({
        to: accountData.fone,
        imagePath,
        caption: includeImageCaption ? messageText : null,
        textMessage: !includeImageCaption ? messageText : null
      });

      // Atualizar status da mensagem
      await CrediarioModel.updateMessageStatus(
        messageId,
        'sent',
        whatsappResponse.messages?.[0]?.id
      );

      console.log('[WHATSAPP_CREDIARIO][SENT]', {
        monthlyAccountId,
        messageId,
        whatsappMessageId: whatsappResponse.messages?.[0]?.id,
        customer: `${accountData.nome} ${accountData.sobrenome}`,
        phone: accountData.fone,
        balance: accountData.balance
      });

      return {
        success: true,
        messageId,
        whatsappMessageId: whatsappResponse.messages?.[0]?.id,
        accountData: {
          id: accountData.id,
          customer: `${accountData.nome} ${accountData.sobrenome}`,
          balance: accountData.balance,
          dueDate: accountData.due_date
        }
      };

    } catch (error) {
      console.error('[WHATSAPP_CREDIARIO][ERROR]', {
        monthlyAccountId,
        error: error.message,
        stack: error.stack
      });

      // Se houve messageId, atualizar como falhou
      if (error.messageId) {
        try {
          const CrediarioModel = require('../models/crediario');
          await CrediarioModel.updateMessageStatus(
            error.messageId,
            'failed',
            null,
            error.message
          );
        } catch (updateError) {
          console.error('[WHATSAPP_CREDIARIO][UPDATE_FAILED]', updateError);
        }
      }

      throw error;
    }
  }

  /**
   * Envia lembretes para contas em atraso
   * @returns {Promise<Array>} Resultados dos envios
   */
  async sendOverdueReminders() {
    try {
      const CrediarioModel = require('../models/crediario');
      const overdueAccounts = await CrediarioModel.getAccountsNeedingReminder();

      console.log('[WHATSAPP_CREDIARIO][REMINDERS]', { 
        count: overdueAccounts.length 
      });

      const results = [];

      for (const account of overdueAccounts) {
        try {
          const result = await this.sendAccountReceipt(account.id, {
            messageType: 'reminder',
            includeImageCaption: true
          });
          
          results.push({
            accountId: account.id,
            success: true,
            ...result
          });

          // Aguardar 2 segundos entre envios para respeitar rate limit
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          results.push({
            accountId: account.id,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log('[WHATSAPP_CREDIARIO][REMINDERS][COMPLETE]', {
        total: results.length,
        success: successCount,
        failed: failCount
      });

      return results;

    } catch (error) {
      console.error('[WHATSAPP_CREDIARIO][REMINDERS][ERROR]', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Envia múltiplas contas em lote
   * @param {Array<number>} accountIds - IDs das contas mensais
   * @param {Object} options - Opções de envio
   * @returns {Promise<Array>} Resultados dos envios
   */
  async sendBatchAccounts(accountIds, options = {}) {
    const results = [];

    for (const accountId of accountIds) {
      try {
        const result = await this.sendAccountReceipt(accountId, options);
        results.push({
          accountId,
          success: true,
          ...result
        });

        // Rate limiting: aguardar 2 segundos entre envios
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          accountId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Constrói mensagem de texto para acompanhar a imagem
   */
  buildReceiptMessage(accountData, messageType) {
    const { nome, sobrenome, month_year, balance, due_date, status } = accountData;
    
    const formatCurrency = (value) => {
      return parseFloat(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      });
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const customerName = `${nome} ${sobrenome}`;
    const balanceFormatted = formatCurrency(balance);
    const dueDateFormatted = formatDate(due_date);

    let messageText = '';

    if (messageType === 'reminder') {
      messageText = `🔔 *LEMBRETE DE VENCIMENTO*\n\n`;
      messageText += `Olá ${customerName}! 👋\n\n`;
      messageText += `Sua conta referente a ${month_year} está `;
      
      if (status === 'overdue') {
        messageText += `*em atraso* desde ${dueDateFormatted}.\n\n`;
      } else {
        messageText += `com vencimento para ${dueDateFormatted}.\n\n`;
      }
      
      messageText += `💰 *Saldo devedor:* ${balanceFormatted}\n\n`;
      messageText += `📋 Segue em anexo o detalhamento completo da sua conta.\n\n`;
      
    } else {
      messageText = `📄 *CONTA MENSAL DE CREDIÁRIO*\n\n`;
      messageText += `Olá ${customerName}! 👋\n\n`;
      messageText += `Sua conta referente a *${month_year}*:\n`;
      messageText += `💰 *Saldo devedor:* ${balanceFormatted}\n`;
      messageText += `📅 *Vencimento:* ${dueDateFormatted}\n\n`;
      messageText += `📋 Segue em anexo o detalhamento completo.\n\n`;
    }

    // Instruções de pagamento
    messageText += `💳 *Como pagar:*\n`;
    messageText += `• 💰 Dinheiro na loja\n`;
    messageText += `• 💳 Cartão (débito/crédito)\n`;
    messageText += `• 📱 PIX (solicite a chave)\n`;
    messageText += `• 🏦 Transferência bancária\n\n`;

    // Opções de interação
    messageText += `📞 *Precisa de alguma coisa?*\n`;
    messageText += `Responda com:\n`;
    messageText += `• "RECEBIDO" para confirmar\n`;
    messageText += `• "SEGUNDA VIA" para nova cópia\n`;
    messageText += `• "QUESTIONAR" para dúvidas\n\n`;
    
    messageText += `Obrigado pela preferência! 😊`;

    return messageText;
  }

  /**
   * Envia mensagem com rate limiting
   */
  async sendWithRateLimit(payload) {
    return new Promise((resolve, reject) => {
      this.rateLimitQueue.push({ payload, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Processa fila de envios respeitando rate limit
   */
  async processQueue() {
    if (this.isProcessingQueue || this.rateLimitQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.rateLimitQueue.length > 0) {
      const { payload, resolve, reject } = this.rateLimitQueue.shift();

      try {
        const result = await this.sendToWhatsApp(payload);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Rate limiting: aguardar antes do próximo envio
      if (this.rateLimitQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 segundos = 5 por minuto
      }
    }

    this.isProcessingQueue = false;
  }

   /**
   * Envia mensagem diretamente para WhatsApp Cloud API
   */
  async sendToWhatsApp({ to, imagePath, caption, textMessage }) {
    // Por enquanto, como não há função de imagem na API atual,
    // vamos enviar apenas como mensagem de texto
    // TODO: Implementar upload de imagem para WhatsApp Cloud API
    
    const finalMessage = textMessage || caption || 'Segue sua conta mensal em anexo.';
    
    console.log('[WHATSAPP_CREDIARIO][SEND_TEXT_FALLBACK]', {
      to,
      imagePath,
      messageLength: finalMessage.length
    });

    const response = await sendTextMessage({
      to,
      body: finalMessage
    });

    return response;
  }

  /**
   * Limpa cache de imagens antigas
   */
  async cleanupCache() {
    try {
      await this.receiptService.cleanupCache();
      console.log('[WHATSAPP_CREDIARIO][CACHE_CLEANUP]', 'Completed');
    } catch (error) {
      console.error('[WHATSAPP_CREDIARIO][CACHE_CLEANUP][ERROR]', error);
    }
  }
}

// Instância singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new WhatsAppCrediarioService();
    }
    return instance;
  },
  WhatsAppCrediarioService
};