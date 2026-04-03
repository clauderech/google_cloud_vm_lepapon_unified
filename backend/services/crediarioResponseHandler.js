const { db } = require('../config/knex');
const WhatsAppCrediarioService = require('../services/whatsappCrediarioService');
const { sendTextMessage } = require('../models/whatsappCloudApi');

/**
 * Handler para processar respostas dos clientes sobre contas de crediário
 * Data: 3 de abril de 2026
 */

class CrediarioResponseHandler {
  constructor() {
    this.whatsappService = WhatsAppCrediarioService.getInstance();
    
    // Palavras-chave que identificam respostas relacionadas à contas
    this.keywords = {
      recebido: ['recebido', 'recebi', 'ok', 'confirmo', 'confirmar', 'confirmado'],
      segundaVia: ['segunda via', '2 via', '2° via', 'segunda', 'reenviar', 'reenvie', 'nova copia'],
      questionar: ['questionar', 'questiono', 'duvida', 'dúvida', 'problema', 'erro', 'discordo', 'contestar', 'contestação']
    };
  }

  /**
   * Verifica se uma mensagem de texto é sobre contas de crediário
   * @param {string} messageText - Texto da mensagem
   * @param {string} userPhone - Telefone do usuário
   * @returns {Promise<Object|null>} Resultado da análise
   */
  async analyzeMessage(messageText, userPhone) {
    try {
      if (!messageText || typeof messageText !== 'string') {
        return null;
      }

      const cleanText = messageText.toLowerCase().trim();
      const words = cleanText.split(/\s+/);
      
      // Verificar se o usuário tem contas ativas ou recentes
      const hasActiveAccount = await this.userHasActiveAccount(userPhone);
      if (!hasActiveAccount) {
        return null;
      }

      // Detectar tipo de resposta
      let responseType = null;
      let confidence = 0;

      // Verificar "RECEBIDO"
      for (const keyword of this.keywords.recebido) {
        if (cleanText.includes(keyword)) {
          responseType = 'recebido';
          confidence = this.calculateConfidence(cleanText, keyword);
          break;
        }
      }

      // Verificar "SEGUNDA VIA"
      if (!responseType) {
        for (const keyword of this.keywords.segundaVia) {
          if (cleanText.includes(keyword)) {
            responseType = 'segunda_via';
            confidence = this.calculateConfidence(cleanText, keyword);
            break;
          }
        }
      }

      // Verificar "QUESTIONAR"
      if (!responseType) {
        for (const keyword of this.keywords.questionar) {
          if (cleanText.includes(keyword)) {
            responseType = 'questionar';
            confidence = this.calculateConfidence(cleanText, keyword);
            break;
          }
        }
      }

      if (responseType && confidence > 0.5) {
        return { 
          type: responseType, 
          confidence, 
          originalText: messageText,
          userPhone 
        };
      }

      return null;

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][ANALYZE][ERROR]', {
        userPhone,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Processa uma resposta identificada do cliente
   * @param {Object} analysis - Resultado da análise da mensagem
   * @returns {Promise<boolean>} True se foi processada
   */
  async processResponse(analysis) {
    try {
      const { type, userPhone, originalText } = analysis;

      console.log('[CREDIARIO_RESPONSE][PROCESS]', {
        type,
        userPhone,
        confidence: analysis.confidence
      });

      // Buscar conta mais recente do usuário
      const recentAccount = await this.getRecentAccount(userPhone);
      if (!recentAccount) {
        console.warn('[CREDIARIO_RESPONSE][NO_RECENT_ACCOUNT]', { userPhone });
        return false;
      }

      switch (type) {
        case 'recebido':
          return await this.handleRecebido(recentAccount, userPhone, originalText);
        
        case 'segunda_via':
          return await this.handleSegundaVia(recentAccount, userPhone, originalText);
        
        case 'questionar':
          return await this.handleQuestionar(recentAccount, userPhone, originalText);
        
        default:
          return false;
      }

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][PROCESS][ERROR]', {
        analysis,
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Handler para "RECEBIDO"
   */
  async handleRecebido(account, userPhone, originalText) {
    try {
      // Registrar que o cliente confirmou recebimento 
      const CrediarioModel = require('../models/crediario');
      await CrediarioModel.recordWhatsAppMessage(
        account.id,
        account.customer_id,
        userPhone,
        'response',
        `Cliente confirmou recebimento: "${originalText}"`
      );

      // Resposta automática
      const responseMessage = `✅ *Recebimento confirmado!*\n\nObrigado por confirmar que recebeu sua conta mensal.\n\n📋 *Resumo da conta:*\n💰 Saldo devedor: ${this.formatCurrency(account.balance)}\n📅 Vencimento: ${this.formatDate(account.due_date)}\n\nPara pagar, use uma das opções informadas na conta. Para dúvidas, pode nos procurar. 😊`;

      await sendTextMessage({
        to: userPhone,
        body: responseMessage
      });

      console.log('[CREDIARIO_RESPONSE][RECEBIDO]', {
        accountId: account.id,
        userPhone,
        sent: true
      });

      return true;

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][RECEBIDO][ERROR]', error);
      return false;
    }
  }

  /**
   * Handler para "SEGUNDA VIA"
   */
  async handleSegundaVia(account, userPhone, originalText) {
    try {
      // Reenviar a conta
      const result = await this.whatsappService.sendAccountReceipt(account.id, {
        messageType: 'resend',
        forceRegenerate: false
      });

      // Registrar a resposta do cliente
      const CrediarioModel = require('../models/crediario');
      await CrediarioModel.recordWhatsAppMessage(
        account.id,
        account.customer_id,
        userPhone,
        'response',
        `Cliente solicitou 2ª via: "${originalText}"`
      );

      console.log('[CREDIARIO_RESPONSE][SEGUNDA_VIA]', {
        accountId: account.id,
        userPhone,
        resent: result.success
      });

      return result.success;

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][SEGUNDA_VIA][ERROR]', error);
      
      // Resposta de erro
      try {
        await sendTextMessage({
          to: userPhone,
          body: `❌ *Erro ao reenviar conta*\n\nDesculpe, houve um problema ao reenviar sua conta. Entre em contato conosco por favor. 📞`
        });
      } catch (sendError) {
        console.error('[CREDIARIO_RESPONSE][SEGUNDA_VIA][SEND_ERROR]', sendError);
      }

      return false;
    }
  }

  /**
   * Handler para "QUESTIONAR"
   */
  async handleQuestionar(account, userPhone, originalText) {
    try {
      // Registrar questionamento para admin
      const CrediarioModel = require('../models/crediario');
      await CrediarioModel.recordWhatsAppMessage(
        account.id,
        account.customer_id,
        userPhone,
        'response',
        `Cliente questionou conta: "${originalText}"`
      );

      // Resposta automática explicativa
      const responseMessage = `❓ *Questionamento recebido*\n\nObrigado por entrar em contato! Recebemos seu questionamento sobre a conta.\n\n👤 Nossa equipe irá verificar e entrar em contato com você em breve.\n\n📋 *Dados da conta questionada:*\n📅 Referência: ${account.month_year}\n💰 Valor total: ${this.formatCurrency(account.total_amount)}\n💰 Saldo devedor: ${this.formatCurrency(account.balance)}\n\n⏰ Aguarde nosso retorno. Obrigado pela paciência! 😊`;

      await sendTextMessage({
        to: userPhone,
        body: responseMessage
      });

      console.log('[CREDIARIO_RESPONSE][QUESTIONAR]', {
        accountId: account.id,
        userPhone,
        notifiedAdmin: true
      });

      // TODO: Integrar com sistema de notificações para admin
      // Pode ser via email, Slack, dashboard interno, etc.

      return true;

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][QUESTIONAR][ERROR]', error);
      return false;
    }
  }

  /**
   * Verifica se usuário tem conta ativa ou recente
   */
  async userHasActiveAccount(userPhone) {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const account = await db('monthly_accounts as ma')
        .leftJoin('customers as c', 'ma.customer_id', 'c.id')
        .where('c.fone', userPhone)
        .where('ma.balance', '>', 0.01)
        .where('ma.last_sent_at', '>', threeDaysAgo)
        .select('ma.id')
        .first();

      return !!account;

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][HAS_ACTIVE_ACCOUNT][ERROR]', { 
        userPhone, 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Busca conta mais recente do usuário
   */
  async getRecentAccount(userPhone) {
    try {
      return await db('monthly_accounts as ma')
        .leftJoin('customers as c', 'ma.customer_id', 'c.id')
        .where('c.fone', userPhone)
        .where('ma.balance', '>', 0.01)
        .orderBy('ma.last_sent_at', 'desc')
        .select('ma.*', 'c.nome', 'c.sobrenome')
        .first();

    } catch (error) {
      console.error('[CREDIARIO_RESPONSE][GET_RECENT_ACCOUNT][ERROR]', { 
        userPhone, 
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Calcula nível de confiança na classificação
   */
  calculateConfidence(text, keyword) {
    const exactMatch = text === keyword ? 1.0 : 0.8;
    const contextWords = ['conta', 'crediario', 'credito', 'mensalidade', 'fatura'];
    const hasContext = contextWords.some(word => text.includes(word));
    
    return hasContext ? Math.min(exactMatch + 0.1, 1.0) : exactMatch * 0.7;
  }

  /**
   * Helpers de formatação
   */
  formatCurrency(value) {
    return parseFloat(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
}

// Instância singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new CrediarioResponseHandler();
    }
    return instance;
  },
  CrediarioResponseHandler
};