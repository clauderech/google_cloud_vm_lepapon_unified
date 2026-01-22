'use strict';

/**
 * Cria tabela de usuários/contatos do WhatsApp
 * Core table para identificação com suporte a business-scoped user IDs
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_users');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_users', (table) => {
      // Identificadores
      table.bigIncrements('id').primary();
      table.string('business_scoped_user_id', 50).unique().nullable();
      table.string('phone_number', 20).unique().nullable();
      table.string('username', 100).unique().nullable();
      
      // Prioridade de ID (1=business_scoped, 2=username, 3=phone)
      table.string('primary_identifier', 50).notNullable();
      table.enum('identification_source', ['phone', 'username', 'business_scoped_id']).notNullable();
      
      // Info de Contato
      table.string('display_name', 255).nullable();
      table.text('profile_picture_url').nullable();
      
      // Status
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_opted_in').defaultTo(true);
      
      // Rastreamento
      table.timestamp('first_message_at').nullable();
      table.timestamp('last_message_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('phone_number');
      table.index('business_scoped_user_id');
      table.index('username');
      table.index('primary_identifier');
      table.index('last_message_at');
      table.unique(['primary_identifier', 'is_active']);
    });
    
    console.log('[Migration] Tabela whatsapp_users criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_users');
};
