'use strict';

/**
 * Cria tabela de mapeamento bidirecional de IDs
 * Rastreia transições: Phone → Username → Business-Scoped ID
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_user_identification_map');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_user_identification_map', (table) => {
      table.bigIncrements('id').primary();
      table.string('user_id', 255).notNullable();
      
      // IDs históricos e atuais
      table.string('phone_number', 20).nullable();
      table.string('business_scoped_user_id', 50).nullable();
      table.string('username', 100).nullable();
      
      // Transição
      table.string('previous_primary_id', 50).nullable();
      table.string('new_primary_id', 50).nullable();
      table.timestamp('transition_date').nullable();
      table.enum('transition_reason', ['adoption', 'migration', 'merge']).nullable();
      
      // Auditoria
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Índices
      table.index('user_id');
      table.index('phone_number');
      table.index('business_scoped_user_id');
      table.index('transition_date');
    });
    
    // Foreign key
    await knex.schema.table('whatsapp_user_identification_map', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_user_identification_map criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_user_identification_map');
};
