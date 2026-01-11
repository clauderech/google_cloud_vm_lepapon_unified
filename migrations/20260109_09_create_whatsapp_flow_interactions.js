'use strict';

/**
 * Cria tabela de rastreamento de interações com flows
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_flow_interactions');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_flow_interactions', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('user_id').unsigned().notNullable();
      
      // Flow Info
      table.string('flow_id', 100).nullable();
      table.string('flow_name', 100).nullable();
      
      // Screens Visitadas
      table.string('screen_visited', 100).nullable();
      table.string('screen_action', 100).nullable();
      table.timestamp('action_timestamp').nullable();
      
      // Dados Coletados
      table.json('form_data').nullable();
      
      // Resultado
      table.enum('flow_outcome', ['completed', 'abandoned', 'error']).nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Índices
      table.index('user_id');
      table.index('flow_id');
      table.index('flow_outcome');
    });
    
    // Foreign key
    await knex.schema.table('whatsapp_flow_interactions', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_flow_interactions criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_flow_interactions');
};
