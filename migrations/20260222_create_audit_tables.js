/**
 * Migration: Criar tabelas de auditoria
 * 
 * Cria as tabelas:
 * - audit_logs: Log de todas as requisições
 * - security_audit_events: Eventos de segurança (401, 403, etc)
 */

exports.up = async function(knex) {
  // Criar tabela de logs de auditoria
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.string('user_id').nullable().index();
    table.string('user_role').nullable();
    table.string('action', 50).notNullable(); // READ, CREATE, UPDATE, DELETE
    table.string('level', 20).notNullable(); // info, warning, error
    table.string('method', 10).notNullable(); // GET, POST, PUT, DELETE
    table.string('endpoint', 500).notNullable();
    table.integer('http_status').notNullable();
    table.text('request_data').nullable();
    table.string('response_status', 20).notNullable(); // success, error
    table.text('error_message').nullable();
    table.integer('duration_ms').nullable();
    table.string('ip_address', 45).nullable().index(); // IPv4 e IPv6
    table.text('user_agent').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    
    // Índices para queries comuns
    table.index(['user_id', 'created_at']);
    table.index(['action', 'created_at']);
    table.index(['http_status', 'created_at']);
    table.index(['user_role', 'created_at']);
  });

  // Criar tabela de eventos de segurança
  await knex.schema.createTable('security_audit_events', (table) => {
    table.increments('id').primary();
    table.string('event_type', 50).notNullable(); // UNAUTHORIZED_ACCESS, FORBIDDEN_ACCESS, etc
    table.string('user_id').nullable().index();
    table.string('user_role').nullable();
    table.string('endpoint', 500).notNullable();
    table.string('method', 10).notNullable();
    table.text('reason').nullable();
    table.string('ip_address', 45).nullable().index();
    table.text('user_agent').nullable();
    table.integer('http_status').notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now()).index();
    
    // Índices para queries de segurança
    table.index(['event_type', 'created_at']);
    table.index(['ip_address', 'created_at']);
    table.index(['user_id', 'created_at']);
  });

  // Criar tabela de relatórios de auditoria (agregações)
  await knex.schema.createTable('audit_reports', (table) => {
    table.increments('id').primary();
    table.date('report_date').notNullable().index();
    table.string('report_type', 50).notNullable(); // daily, weekly, monthly
    table.integer('total_requests').defaultTo(0);
    table.integer('successful_requests').defaultTo(0);
    table.integer('failed_requests').defaultTo(0);
    table.integer('security_events').defaultTo(0);
    table.json('data_by_action').nullable();
    table.json('data_by_user').nullable();
    table.json('data_by_role').nullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    
    table.index(['report_date', 'report_type']);
  });

  console.log('[MIGRATION] Tabelas de auditoria criadas com sucesso');
};

exports.down = async function(knex) {
  // Dropar tabelas na ordem inversa (por foreign keys)
  await knex.schema.dropTableIfExists('audit_reports');
  await knex.schema.dropTableIfExists('security_audit_events');
  await knex.schema.dropTableIfExists('audit_logs');

  console.log('[MIGRATION] Tabelas de auditoria removidas');
};
