/**
 * Rotas de Auditoria
 * GET /api/audit/logs - Listar logs
 * GET /api/audit/stats - Estatísticas
 * GET /api/audit/events - Eventos de segurança
 * POST /api/audit/cleanup - Limpar logs antigos
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authUnified');
const { requireAdmin } = require('../middleware/roleAuth');
const {
  getAuditLogs,
  getAuditStats,
  recordSecurityEvent,
  cleanupOldLogs
} = require('../middleware/auditLogger');

/**
 * GET /api/audit/logs
 * Listar logs de auditoria (apenas admin)
 * Query params:
 *   - userId: Filtrar por usuário
 *   - userRole: Filtrar por role
 *   - action: Filtrar por ação (READ, CREATE, UPDATE, DELETE)
 *   - endpoint: Filtrar por endpoint
 *   - startDate: Data inicial (ISO format)
 *   - endDate: Data final (ISO format)
 *   - status: success ou error
 *   - limit: Número de registros (máximo 1000)
 */
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    console.log('[AUDIT][ROUTE] GET /logs', {
      filters: req.query,
      user: req.user?.id
    });

    const logs = await getAuditLogs({
      userId: req.query.userId,
      userRole: req.query.userRole,
      action: req.query.action,
      endpoint: req.query.endpoint,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    });

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao buscar logs:', err);
    res.status(500).json({
      error: 'Erro ao buscar logs de auditoria',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/logs/:id
 * Obter um log específico
 */
router.get('/logs/:id', requireAdmin, async (req, res) => {
  try {
    const { db } = require('../config/knex');
    const log = await db('audit_logs').where('id', req.params.id).first();

    if (!log) {
      return res.status(404).json({ error: 'Log não encontrado' });
    }

    // Parse JSON se necessário
    if (typeof log.request_data === 'string') {
      log.request_data = JSON.parse(log.request_data);
    }

    res.json(log);
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao buscar log:', err);
    res.status(500).json({
      error: 'Erro ao buscar log',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/stats
 * Obter estatísticas de auditoria
 * Query params:
 *   - timeRange: 24h, 7d, 30d (default: 24h)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '24h';
    
    console.log('[AUDIT][ROUTE] GET /stats', {
      timeRange,
      user: req.user?.id
    });

    const stats = await getAuditStats(timeRange);

    res.json({
      success: true,
      timeRange,
      stats
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao gerar estatísticas:', err);
    res.status(500).json({
      error: 'Erro ao gerar estatísticas',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/events
 * Listar eventos de segurança (não autorizado, acesso negado)
 */
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const { db } = require('../config/knex');

    let query = db('security_audit_events');

    if (req.query.eventType) {
      query = query.where('event_type', req.query.eventType);
    }

    if (req.query.startDate) {
      query = query.where('created_at', '>=', new Date(req.query.startDate));
    }

    if (req.query.endDate) {
      query = query.where('created_at', '<=', new Date(req.query.endDate));
    }

    const events = await query
      .orderBy('created_at', 'desc')
      .limit(Math.min(req.query.limit || 100, 1000));

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao buscar eventos:', err);
    res.status(500).json({
      error: 'Erro ao buscar eventos de segurança',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/summary
 * Resumo das atividades recentes
 */
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const { db } = require('../config/knex');

    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const summary = {
      recentActivity: await db('audit_logs')
        .where('created_at', '>=', last24h)
        .orderBy('created_at', 'desc')
        .limit(10),

      topUsers: await db('audit_logs')
        .where('created_at', '>=', last24h)
        .groupBy('user_id')
        .count('* as count')
        .select('user_id')
        .orderBy('count', 'desc')
        .limit(10),

      topEndpoints: await db('audit_logs')
        .where('created_at', '>=', last24h)
        .groupBy('endpoint')
        .count('* as count')
        .select('endpoint')
        .orderBy('count', 'desc')
        .limit(10),

      recentSecurityEvents: await db('security_audit_events')
        .where('created_at', '>=', last24h)
        .orderBy('created_at', 'desc')
        .limit(10),

      stats: {
        totalRequests: await db('audit_logs')
          .where('created_at', '>=', last24h)
          .count('* as count')
          .first(),

        failedRequests: await db('audit_logs')
          .where('created_at', '>=', last24h)
          .where('http_status', '>=', 400)
          .count('* as count')
          .first(),

        securityIncidents: await db('security_audit_events')
          .where('created_at', '>=', last24h)
          .count('* as count')
          .first()
      }
    };

    res.json({
      success: true,
      summary
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao gerar resumo:', err);
    res.status(500).json({
      error: 'Erro ao gerar resumo',
      details: err.message
    });
  }
});

/**
 * POST /api/audit/cleanup
 * Limpar logs antigos (apenas admin)
 * Body: { daysToKeep: number }
 */
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const daysToKeep = req.body.daysToKeep || 90;

    console.log('[AUDIT][ROUTE] POST /cleanup', {
      daysToKeep,
      user: req.user?.id
    });

    // Registrar ação de cleanup na auditoria
    await recordSecurityEvent(req, 'AUDIT_CLEANUP', {
      daysToKeep,
      user: req.user?.id
    });

    const deleted = await cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      message: `${deleted} logs antigos foram removidos`,
      deleted
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao limpar logs:', err);
    res.status(500).json({
      error: 'Erro ao limpar logs',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/user/:userId
 * Listar todas as ações de um usuário específico
 */
router.get('/user/:userId', requireAdmin, async (req, res) => {
  try {
    const logs = await getAuditLogs({
      userId: req.params.userId,
      limit: req.query.limit ? parseInt(req.query.limit) : 100
    });

    res.json({
      success: true,
      userId: req.params.userId,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao buscar logs do usuário:', err);
    res.status(500).json({
      error: 'Erro ao buscar logs do usuário',
      details: err.message
    });
  }
});

/**
 * GET /api/audit/export
 * Exportar logs em CSV
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const logs = await getAuditLogs({
      userId: req.query.userId,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: 10000
    });

    // Gerar CSV
    const headers = [
      'ID',
      'User ID',
      'User Role',
      'Action',
      'Method',
      'Endpoint',
      'Status',
      'HTTP Status',
      'Duration (ms)',
      'IP Address',
      'Timestamp'
    ];

    let csv = headers.join(',') + '\n';

    logs.forEach(log => {
      csv += [
        log.id,
        log.user_id || '-',
        log.user_role || '-',
        log.action,
        log.method,
        log.endpoint,
        log.response_status,
        log.http_status,
        log.duration_ms || 0,
        log.ip_address,
        log.timestamp
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
    res.send(csv);
  } catch (err) {
    console.error('[AUDIT][ROUTE][ERROR] Erro ao exportar logs:', err);
    res.status(500).json({
      error: 'Erro ao exportar logs',
      details: err.message
    });
  }
});

module.exports = router;
