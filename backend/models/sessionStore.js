'use strict';

/**
 * Armazena dados de sessão dos usuários em memória
 * Mapeia: phoneNumber → { sessionId, timestamp, flowData, ... }
 */
class SessionStore {
  constructor(options = {}) {
    this.sessions = new Map(); // phoneNumber → { sessionId, timestamp, flowData }
    this.maxAge = options.maxAge || 3600000; // 1 hora em ms
    this.cleanupInterval = options.cleanupInterval || 600000; // 10 minutos

    // Limpar sessões expiradas periodicamente
    this.startCleanup();
  }

  /**
   * Cria ou atualiza uma sessão de usuário
   */
  setSession(phoneNumber, data = {}) {
    if (!phoneNumber || phoneNumber === 'unknown') {
      console.warn('[SessionStore] phoneNumber inválido');
      return null;
    }

    const existing = this.sessions.get(phoneNumber);
    const sessionId = existing?.sessionId || `session_${phoneNumber}_${Date.now()}`;
    
    const session = {
      phoneNumber,
      sessionId,
      timestamp: Date.now(),
      firstMessageAt: existing?.firstMessageAt || Date.now(),
      ...existing,
      ...data,
    };

    this.sessions.set(phoneNumber, session);
    console.log(`[SessionStore] Sessão criada/atualizada para ${phoneNumber}`);
    return session;
  }

  /**
   * Obtém uma sessão por número de telefone
   */
  getSession(phoneNumber) {
    if (!phoneNumber) return null;
    
    const session = this.sessions.get(phoneNumber);
    if (!session) {
      console.log(`[SessionStore] Sessão não encontrada para ${phoneNumber}`);
      return null;
    }

    // Verificar se expirou
    if (Date.now() - session.timestamp > this.maxAge) {
      console.log(`[SessionStore] Sessão expirada para ${phoneNumber}`);
      this.sessions.delete(phoneNumber);
      return null;
    }

    return session;
  }

  /**
   * Atualiza dados da sessão
   */
  updateSession(phoneNumber, data) {
    const session = this.getSession(phoneNumber);
    if (!session) return null;

    Object.assign(session, data);
    session.timestamp = Date.now();
    this.sessions.set(phoneNumber, session);
    console.log(`[SessionStore] Sessão atualizada para ${phoneNumber}`);
    return session;
  }

  /**
   * Remove uma sessão
   */
  deleteSession(phoneNumber) {
    this.sessions.delete(phoneNumber);
    console.log(`[SessionStore] Sessão removida para ${phoneNumber}`);
  }

  /**
   * Limpar sessões expiradas
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      let removed = 0;
      const now = Date.now();

      for (const [phoneNumber, session] of this.sessions.entries()) {
        if (now - session.timestamp > this.maxAge) {
          this.sessions.delete(phoneNumber);
          removed++;
        }
      }

      if (removed > 0) {
        console.log(`[SessionStore] Limpeza: ${removed} sessões expiradas removidas`);
      }
    }, this.cleanupInterval);
  }

  /**
   * Para o cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * Obtém quantidade total de sessões ativas
   */
  getActiveCount() {
    return this.sessions.size;
  }

  /**
   * Lista todas as sessões ativas
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }
}

module.exports = {
  SessionStore,
  createSessionStore: (options) => new SessionStore(options),
};
