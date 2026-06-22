/**
 * Middleware de Auditoria
 * Registra todas as ações dos usuários para rastreamento
 * 
 * Rastreia:
 * - GET: Acesso a dados
 * - POST: Criação de registros
 * - PUT: Modificação de registros
 * - DELETE: Remoção de registros
 * - FALHAS: Tentativas não autorizadas
 */

const { db } = require('../config/knex');

// Tipos de ações a auditar
const AUDIT_CONFIG = {
  GET: { level: 'info', action: 'READ' },
  POST: { level: 'warning', action: 'CREATE' },
  PUT: { level: 'warning', action: 'UPDATE' },
  DELETE: { level: 'error', action: 'DELETE' },
  PATCH: { level: 'warning', action: 'MODIFY' }
};

// Rotas que NÃO são auditadas (muito barulho)
const SKIP_AUDIT_PATHS = [
  '/api/health',
  '/api/ping',
  '/api/status',
  '/favicon.ico',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.gif'
];

/**
 * Verificar se a rota deve ser auditada
 */
const shouldAudit = (path) => {
  return !SKIP_AUDIT_PATHS.some(skip => path.includes(skip));
};

/**
 * Extrair informação relevante da requisição
 */
const extractRequestInfo = (req) => {
  return {
    method: req.method,
    path: req.path || req.originalUrl,
    query: req.query || {},
    body: req.body ? {
      ...req.body,
      password: req.body.password ? '***' : undefined // Nunca auditar senhas
    } : {},
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  };
};

/**
 * Extrair resultado da resposta
 */
const extractResponseInfo = (statusCode, responseData) => {
  return {
    statusCode,
    success: statusCode < 400,
    timestamp: new Date().toISOString()
  };
};

/**
 * Middleware de auditoria que registra todas as requisições
 */
const auditLogger = async (req, res, next) => {
  // Pular rotas não auditadas
  if (!shouldAudit(req.path)) {
    return next();
  }

  const startTime = Date.now();
  const originalSend = res.send;

  let responseStatus = 200;
  let responseBody = null;

  // Interceptar resposta para capturar status e dados
  res.send = function(data) {
    responseStatus = res.statusCode;
    responseBody = data;
    
    // Registrar auditoria depois de enviar resposta
    process.nextTick(() => {
      recordAudit(req, responseStatus, responseBody);
    });

    return originalSend.call(this, data);
  };

  // Registrar erro se houver
  res.on('error', (err) => {
    recordAudit(req, 500, null, err);
  });

  next();
};

/**
 * Registrar entrada de auditoria no banco de dados
 */
const recordAudit = async (req, statusCode, responseBody, error = null) => {
  try {
    const duration = Date.now() - req._startTime || 0;
    const auditConfig = AUDIT_CONFIG[req.method] || { level: 'info', action: 'REQUEST' };

    const auditEntry = {
      user_id: req.user?.id || 'anonymous',
      user_role: req.user?.role || null,
      action: auditConfig.action,
      level: auditConfig.level,
      method: req.method,
      endpoint: req.path,
      http_status: statusCode,
      request_data: JSON.stringify(extractRequestInfo(req)),
      response_status: statusCode < 400 ? 'success' : 'error',
      error_message: error ? error.message : null,
      duration_ms: duration,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      // Usar Date nativo para MySQL DATETIME/TIMESTAMP (evita ISO com "T" e "Z").
      timestamp: new Date(),
      created_at: new Date()
    };

    // Registrar no banco de dados
    await db('audit_logs').insert(auditEntry);

    // Log console para ações críticas
    if (auditConfig.level === 'error' || statusCode >= 400) {
      console.log(`[AUDIT][${auditConfig.level.toUpperCase()}] ${req.method} ${req.path} - ${statusCode} (${req.user?.id || 'anonymous'})`);
    }
  } catch (err) {
    // Não quebrar a aplicação se auditoria falhar
    console.error('[AUDIT][ERROR] Falha ao registrar auditoria:', err.message);
  }
};

/**
 * Middleware separado para registrar falhas de autenticação
 */
const auditAuthFailure = async (req, res, next) => {
  const originalSend = res.send;

  res.send = function(data) {
    // Se for 401 ou 403, registrar como falha de segurança
    if (res.statusCode === 401 || res.statusCode === 403) {
      recordSecurityEvent(req, res.statusCode, data);
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Registrar eventos de segurança (falhas de autenticação, acesso negado, etc)
 */
const recordSecurityEvent = async (req, eventType, details = {}) => {
  try {
    const securityEntry = {
      event_type: eventType === 401 ? 'UNAUTHORIZED_ACCESS' : 'FORBIDDEN_ACCESS',
      user_id: req.user?.id || 'anonymous',
      user_role: req.user?.role || null,
      endpoint: req.path,
      method: req.method,
      reason: details.error || details.message || 'Unknown',
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent'),
      http_status: eventType,
      // Usar Date nativo para MySQL DATETIME/TIMESTAMP (evita ISO com "T" e "Z").
      timestamp: new Date(),
      created_at: new Date()
    };

    await db('security_audit_events').insert(securityEntry);

    // Log em vermelho para eventos de segurança
    console.warn(`[SECURITY][ALERT] ${eventType} - ${req.method} ${req.path} (${securityEntry.ip_address})`);
  } catch (err) {
    console.error('[SECURITY][AUDIT][ERROR] Falha ao registrar evento de segurança:', err.message);
  }
};

/**
 * Obter logs de auditoria com filtros
 */
const getAuditLogs = async (filters = {}) => {
  try {
    let query = db('audit_logs');

    if (filters.userId) {
      query = query.where('user_id', filters.userId);
    }

    if (filters.userRole) {
      query = query.where('user_role', filters.userRole);
    }

    if (filters.action) {
      query = query.where('action', filters.action);
    }

    if (filters.endpoint) {
      query = query.where('endpoint', 'like', `%${filters.endpoint}%`);
    }

    if (filters.startDate) {
      query = query.where('created_at', '>=', new Date(filters.startDate));
    }

    if (filters.endDate) {
      query = query.where('created_at', '<=', new Date(filters.endDate));
    }

    if (filters.status) {
      query = query.where('response_status', filters.status);
    }

    // Ordenar por mais recente primeiro
    query = query.orderBy('created_at', 'desc');

    // Limitar resultado
    const limit = Math.min(filters.limit || 100, 1000); // Máximo 1000
    query = query.limit(limit);

    const logs = await query;
    return logs;
  } catch (err) {
    console.error('[AUDIT][ERROR] Erro ao recuperar logs:', err.message);
    throw err;
  }
};

/**
 * Obter estatísticas de auditoria
 */
const getAuditStats = async (timeRange = '24h') => {
  try {
    const startDate = new Date();
    
    if (timeRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    }

    const stats = {
      totalRequests: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .count('* as count')
        .first(),

      byAction: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .groupBy('action')
        .count('* as count')
        .select('action'),

      byUser: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .groupBy('user_id')
        .count('* as count')
        .select('user_id'),

      byRole: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .groupBy('user_role')
        .count('* as count')
        .select('user_role'),

      byStatus: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .groupBy('response_status')
        .count('* as count')
        .select('response_status'),

      errors: await db('audit_logs')
        .where('created_at', '>=', startDate)
        .where('http_status', '>=', 400)
        .count('* as count')
        .first(),

      securityEvents: await db('security_audit_events')
        .where('created_at', '>=', startDate)
        .groupBy('event_type')
        .count('* as count')
        .select('event_type')
    };

    return stats;
  } catch (err) {
    console.error('[AUDIT][ERROR] Erro ao gerar estatísticas:', err.message);
    throw err;
  }
};

/**
 * Limpar logs antigos (retention policy)
 */
const cleanupOldLogs = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await db('audit_logs')
      .where('created_at', '<', cutoffDate)
      .delete();

    console.log(`[AUDIT][CLEANUP] Removidos ${deleted} logs antigos`);
    return deleted;
  } catch (err) {
    console.error('[AUDIT][ERROR] Erro ao limpar logs antigos:', err.message);
  }
};

module.exports = {
  auditLogger,
  auditAuthFailure,
  recordAudit,
  recordSecurityEvent,
  getAuditLogs,
  getAuditStats,
  cleanupOldLogs
};
