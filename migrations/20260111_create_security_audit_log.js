'use strict';

/**
 * Cria tabela de log de auditoria de segurança
 * Rastreia tentativas suspeitas de acesso, violações de token, etc
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('security_audit_log');
  
  if (!hasTable) {
    await knex.schema.createTable('security_audit_log', (table) => {
      table.bigIncrements('id').primary();
      
      // Tipo de evento
      table.enum('event_type', [
        'token_not_found',        // Flow token não encontrado no DB
        'token_hijack_attempt',   // Tentativa de usar token de outro user
        'invalid_flow_token',     // Token inválido/expirado
        'unauthorized_access',    // Acesso não autorizado
        'session_mismatch',       // Sessão não bate com user
        'suspicious_activity',    // Atividade suspeita geral
      ]).notNullable();
      
      // Usuário envolvido
      table.string('user_id', 255).nullable();
      table.string('phone_number', 20).nullable();
      
      // Detalhes do evento (JSON)
      table.json('details').nullable();
      
      // Timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Índices para queries frequentes
      table.index('event_type');
      table.index('user_id');
      table.index('phone_number');
      table.index('created_at');
      
      // Índice composto para buscar eventos por usuário e tipo
      table.index(['user_id', 'event_type']);
      
      // Foreign key com ON DELETE CASCADE
      table.foreign('user_id')
        .references('whatsapp_users.id')
        .onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela security_audit_log criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('security_audit_log');
};
