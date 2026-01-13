'use strict';

const WebSocket = require('ws');
const TokenManager = require('./tokenManager');

/**
 * LePaponWebSocketClient - Cliente que se conecta ao WebSocket do LePapon
 * e recebe eventos de novo_order
 */
class LePaponWebSocketClient {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || 
      process.env.WS_URL || 
      'ws://lepapon.com.br:3001';
    this.tokenManager = options.tokenManager || new TokenManager();
    this.orderProcessor = options.orderProcessor;
    this.logger = options.logger || console;
    
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.maxReconnectDelay = options.maxReconnectDelay || 60000;
    this.isManualClose = false;
  }

  /**
   * Conecta ao WebSocket do LePapon
   */
  async connect() {
    try {
      // Obter token
      const token = await this.tokenManager.getToken();
      const maskedToken = this.tokenManager.maskToken(token);
      
      // Construir URL com token
      const url = `${this.wsUrl}?token=${token}`;
      const maskedUrl = `${this.wsUrl}?token=${maskedToken}`;
      
      this.logger.info(`[LePaponWS] Conectando em ${maskedUrl}`);

      // Criar conexão
      this.ws = new WebSocket(url);

      // Event: conexão aberta
      this.ws.on('open', () => {
        this.logger.info('[LePaponWS] Conectado ao servidor LePapon');
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      // Event: mensagem recebida
      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      // Event: erro
      this.ws.on('error', (error) => {
        this.logger.error('[LePaponWS] Erro na conexão:', error.message);
        this.emit('error', error);
      });

      // Event: desconexão
      this.ws.on('close', (code, reason) => {
        this.logger.warn(`[LePaponWS] Desconectado. Code: ${code}, Razão: ${reason}`);
        
        if (!this.isManualClose) {
          this.scheduleReconnect();
        }
      });

    } catch (error) {
      this.logger.error('[LePaponWS] Erro ao conectar:', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Trata mensagens recebidas do servidor
   */
  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      this.logger.debug('[LePaponWS] Mensagem recebida:', {
        event: message.event,
        type: message.type,
        timestamp: message.timestamp
      });

      // Processar evento new_order
      if (message.event === 'new_order' || message.event === 'novo_pedido') {
        if (this.orderProcessor) {
          await this.orderProcessor.processNewOrder(message);
        } else {
          this.logger.warn('[LePaponWS] orderProcessor não configurado, pedido ignorado');
        }
      } else {
        this.logger.debug('[LePaponWS] Evento ignorado:', message.event);
      }

    } catch (error) {
      this.logger.error('[LePaponWS] Erro ao processar mensagem:', error.message);
    }
  }

  /**
   * Agenda reconexão automática com backoff exponencial
   */
  scheduleReconnect() {
    if (this.isManualClose) {
      this.logger.info('[LePaponWS] Reconexão desabilitada (fechamento manual)');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`[LePaponWS] Max tentativas de reconexão (${this.maxReconnectAttempts}) atingidas`);
      this.emit('max_reconnect_attempts');
      return;
    }

    this.reconnectAttempts++;
    
    // Backoff exponencial: delay * 2^attempts, capped em maxReconnectDelay
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.logger.info(`[LePaponWS] Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Fecha conexão manualmente
   */
  close() {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close(1000, 'Manual close');
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Retorna status da conexão
   */
  getStatus() {
    return {
      isConnected: this.isConnected(),
      wsUrl: this.wsUrl,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      state: this.ws ? this.ws.readyState : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Emite eventos (simples implementação local)
   */
  emit(eventName, data) {
    // Placeholder para evento emissions
    // Em produção, usar EventEmitter do Node.js
  }
}

module.exports = LePaponWebSocketClient;
