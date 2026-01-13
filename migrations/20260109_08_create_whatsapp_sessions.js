'use strict';

/**
 * Cria tabela de sessões ativas de usuário
 * Substitui SessionStore em memória, com persistência
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_sessions');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_sessions', (table) => {
      table.bigIncrements('id').primary();
      table.string('user_id', 255).notNullable();
      
      // Identificação da Sessão
      table.string('session_id', 255).unique().notNullable();
      table.string('flow_session_id', 255).nullable();
      
      // Estado da Sessão
      table.json('session_state').nullable();
      table.string('current_screen', 100).nullable();
      
      // Dados Temporários
      table.json('temporary_data').nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('last_activity').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      table.timestamp('expires_at').nullable();
      
      // Índices
      table.index('user_id');
      table.index('session_id');
      table.index('expires_at');
    });
    
    // Foreign key
    await knex.schema.table('whatsapp_sessions', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_sessions criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_sessions');
};
