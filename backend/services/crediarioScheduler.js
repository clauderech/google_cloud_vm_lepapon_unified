const cron = require('node-cron');
const WhatsAppCrediarioService = require('./whatsappCrediarioService');

/**
 * Job scheduler para envio automático de lembretes de contas vencidas
 * Data: 3 de abril de 2026
 */

class CrediarioScheduler {
  constructor() {
    this.whatsappService = WhatsAppCrediarioService.getInstance();
    this.isRunning = false;
    this.jobs = new Map();
  }

  /**
   * Inicia os jobs agendados
   */
  start() {
    if (this.isRunning) {
      console.log('[CREDIARIO_SCHEDULER] Scheduler já está rodando');
      return;
    }

    console.log('[CREDIARIO_SCHEDULER] Iniciando jobs...');

    // Job principal: Lembretes semanais às segundas-feiras às 09:00
    const weeklyRemindersJob = cron.schedule('0 9 * * 1', async () => {
      await this.runWeeklyReminders();
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    this.jobs.set('weeklyReminders', weeklyRemindersJob);

    // Job de limpeza de cache: Todos os dias às 02:00
    const cacheCleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.runCacheCleanup();
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo"
    });

    this.jobs.set('cacheCleanup', cacheCleanupJob);

    // Job de teste: A cada 10 minutos (apenas para debug/desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      const testJob = cron.schedule('*/10 * * * *', async () => {
        await this.runTestReminders();
      }, {
        scheduled: false, // Inicialmente desabilitado
        timezone: "America/Sao_Paulo"
      });

      this.jobs.set('testReminders', testJob);
      console.log('[CREDIARIO_SCHEDULER] Job de teste criado (desabilitado). Use startTestJob() para ativar.');
    }

    this.isRunning = true;
    console.log('[CREDIARIO_SCHEDULER] Jobs iniciados com sucesso');
    console.log('[CREDIARIO_SCHEDULER] Próximo lembrete semanal: segunda-feira às 09:00');
    console.log('[CREDIARIO_SCHEDULER] Limpeza de cache: diariamente às 02:00');
  }

  /**
   * Para todos os jobs agendados
   */
  stop() {
    if (!this.isRunning) {
      console.log('[CREDIARIO_SCHEDULER] Scheduler não está rodando');
      return;
    }

    console.log('[CREDIARIO_SCHEDULER] Parando jobs...');

    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      console.log(`[CREDIARIO_SCHEDULER] Job '${name}' parado`);
    }

    this.jobs.clear();
    this.isRunning = false;
    console.log('[CREDIARIO_SCHEDULER] Scheduler parado');
  }

  /**
   * Executa lembretes semanais
   */
  async runWeeklyReminders() {
    try {
      console.log('[CREDIARIO_SCHEDULER][WEEKLY] Executando lembretes semanais...');
      
      const startTime = Date.now();
      const results = await this.whatsappService.sendOverdueReminders();
      const duration = Date.now() - startTime;

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log('[CREDIARIO_SCHEDULER][WEEKLY] Lembretes concluídos:', {
        duration: `${duration}ms`,
        total: results.length,
        success: successCount,
        failed: failCount
      });

      // Log dos erros se houver
      if (failCount > 0) {
        const failedAccounts = results.filter(r => !r.success);
        console.error('[CREDIARIO_SCHEDULER][WEEKLY] Falhas:', failedAccounts.map(f => ({
          accountId: f.accountId,
          error: f.error
        })));
      }

    } catch (error) {
      console.error('[CREDIARIO_SCHEDULER][WEEKLY][ERROR]', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Executa limpeza de cache
   */
  async runCacheCleanup() {
    try {
      console.log('[CREDIARIO_SCHEDULER][CLEANUP] Executando limpeza de cache...');
      
      await this.whatsappService.cleanupCache();
      
      console.log('[CREDIARIO_SCHEDULER][CLEANUP] Limpeza de cache concluída');

    } catch (error) {
      console.error('[CREDIARIO_SCHEDULER][CLEANUP][ERROR]', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Executa lembretes de teste (apenas desenvolvimento)
   */
  async runTestReminders() {
    try {
      console.log('[CREDIARIO_SCHEDULER][TEST] Executando lembretes de teste...');
      
      // Buscar apenas 1-2 contas para teste
      const CrediarioModel = require('../models/crediario');
      const testAccounts = await CrediarioModel.getAccountsNeedingReminder();
      const limitedAccounts = testAccounts.slice(0, 2); // Máximo 2 para teste

      if (limitedAccounts.length === 0) {
        console.log('[CREDIARIO_SCHEDULER][TEST] Nenhuma conta para teste encontrada');
        return;
      }

      console.log(`[CREDIARIO_SCHEDULER][TEST] Testando com ${limitedAccounts.length} conta(s)`);

      for (const account of limitedAccounts) {
        try {
          await this.whatsappService.sendAccountReceipt(account.id, {
            messageType: 'reminder'
          });
          console.log(`[CREDIARIO_SCHEDULER][TEST] Conta ${account.id} enviada`);
        } catch (error) {
          console.error(`[CREDIARIO_SCHEDULER][TEST] Erro na conta ${account.id}:`, error.message);
        }
      }

    } catch (error) {
      console.error('[CREDIARIO_SCHEDULER][TEST][ERROR]', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Métodos de controle para desenvolvimento/debug
   */
  startTestJob() {
    const testJob = this.jobs.get('testReminders');
    if (testJob) {
      testJob.start();
      console.log('[CREDIARIO_SCHEDULER] Job de teste ativado - lembretes a cada 10 minutos');
    }
  }

  stopTestJob() {
    const testJob = this.jobs.get('testReminders');
    if (testJob) {
      testJob.stop();
      console.log('[CREDIARIO_SCHEDULER] Job de teste desativado');
    }
  }

  /**
   * Executa lembretes manualmente (para testes)
   */
  async runManualReminders() {
    console.log('[CREDIARIO_SCHEDULER][MANUAL] Executando lembretes manualmente...');
    await this.runWeeklyReminders();
  }

  /**
   * Status dos jobs
   */
  getStatus() {
    const status = {
      running: this.isRunning,
      jobs: {}
    };

    for (const [name, job] of this.jobs.entries()) {
      status.jobs[name] = {
        running: job.running,
        lastDate: job.lastDate,
        nextDate: job.nextDate?.toISO?.() || job.nextDate?.toString?.() || 'N/A'
      };
    }

    return status;
  }

  /**
   * Lista próximas execuções
   */
  getNextExecutions() {
    const executions = [];

    for (const [name, job] of this.jobs.entries()) {
      if (job.nextDate) {
        executions.push({
          job: name,
          nextExecution: job.nextDate?.toISO?.() || job.nextDate?.toString?.() || 'N/A',
          running: job.running
        });
      }
    }

    return executions.sort((a, b) => new Date(a.nextExecution) - new Date(b.nextExecution));
  }
}

// Instância singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new CrediarioScheduler();
    }
    return instance;
  },
  CrediarioScheduler
};