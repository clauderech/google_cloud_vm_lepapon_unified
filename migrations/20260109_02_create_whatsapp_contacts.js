'use strict';

/**
 * Cria tabela de dados expandidos de contato
 * Complementa whatsapp_users com informações pessoais e preferências
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_contacts');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_contacts', (table) => {
      table.bigIncrements('id').primary();
      table.string('user_id', 255).unique().notNullable();
      
      // Informações Pessoais
      table.string('full_name', 255).nullable();
      table.string('email', 255).nullable();
      table.date('birthdate').nullable();
      table.enum('gender', ['M', 'F', 'OTHER', 'PREFER_NOT']).nullable();
      
      // Localização
      table.string('street_address', 255).nullable();
      table.string('city', 100).nullable();
      table.string('state', 50).nullable();
      table.string('postal_code', 20).nullable();
      table.string('country', 100).nullable();
      table.decimal('coordinates_lat', 10, 8).nullable();
      table.decimal('coordinates_lon', 11, 8).nullable();
      
      // Preferências
      table.enum('language', ['pt_BR', 'en', 'es']).defaultTo('pt_BR');
      table.string('timezone', 50).nullable();
      table.enum('preferred_delivery_type', ['pickup', 'delivery', 'no_preference']).defaultTo('no_preference');
      
      // Tags/Segmentação
      table.json('tags').nullable();
      table.json('custom_fields').nullable();
      
      // Notas
      table.text('notes').nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('user_id');
      table.index('email');
      table.index('city');
    });
    
    // Foreign key (adicionar separadamente para melhor compatibilidade)
    await knex.schema.table('whatsapp_contacts', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_contacts criada');
  }
};

exports.down = async function down(knex) {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await knex.schema.dropTableIfExists('whatsapp_contacts');
  } finally {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
  }
};
