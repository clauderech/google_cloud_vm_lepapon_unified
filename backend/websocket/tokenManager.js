'use strict';

const fetch = require('node-fetch');

/**
 * TokenManager - Gerencia autenticação com LePapon WebSocket
 */
class TokenManager {
  constructor(options = {}) {
    this.token = options.token || process.env.WS_AUTH_TOKEN;
    this.tokenEndpoint = options.tokenEndpoint || 
      process.env.WS_TOKEN_ENDPOINT || 
      'https://lepapon.com.br/api/websocket/token';
    this.logger = options.logger || console;
    this.tokenExpireTime = null;
    this.tokenRefreshBuffer = 5 * 60 * 1000; // 5 minutos antes de expirar
  }

  /**
   * Obtém token (env var ou fetch dinâmico)
   */
  async getToken() {
    // Se token vem de env var, retorna direto
    if (this.token) {
      this.logger.debug('[TokenManager] Usando token de env var');
      return this.token;
    }

    // Caso contrário, faz fetch dinâmico
    if (this.tokenExpireTime && Date.now() < this.tokenExpireTime) {
      this.logger.debug('[TokenManager] Token em cache, válido até', new Date(this.tokenExpireTime).toISOString());
      return this.token;
    }

    return this.fetchToken();
  }

  /**
   * Faz fetch do token no endpoint
   */
  async fetchToken() {
    try {
      this.logger.info('[TokenManager] Fetchando token de', this.tokenEndpoint);
      
      const response = await fetch(this.tokenEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('Resposta não contém campo "token"');
      }

      this.token = data.token;
      
      // Assumir validade de 1 hora se não especificado
      const expiresIn = data.expiresIn || 3600;
      this.tokenExpireTime = Date.now() + (expiresIn * 1000) - this.tokenRefreshBuffer;

      this.logger.info('[TokenManager] Token obtido. Expira em', new Date(this.tokenExpireTime).toISOString());
      
      return this.token;
    } catch (error) {
      this.logger.error('[TokenManager] Erro ao buscar token:', error.message);
      throw new Error(`TokenManager: Falha ao obter token - ${error.message}`);
    }
  }

  /**
   * Mascarar token para log seguro
   */
  maskToken(token) {
    if (!token || token.length < 10) return token;
    return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
  }
}

module.exports = TokenManager;
