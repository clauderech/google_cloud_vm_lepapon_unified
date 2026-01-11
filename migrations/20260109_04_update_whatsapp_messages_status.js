'use strict';

/**
 * Atualiza tabela whatsapp_messages com novo status de entrega
 * Adiciona relacionamento com user_id
 */

exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_messages', 'delivery_status');
  
  if (!hasColumn) {
    await knex.schema.table('whatsapp_messages', (table) => {
      table.bigInteger('user_id').unsigned().nullable();
      table.enum('delivery_status', [
        'sent',
        'delivered',
        'read',
        'failed',
        'expired'
      ]).defaultTo('sent');
      table.integer('reply_to_message_id').unsigned().nullable();
      table.integer('thread_id').unsigned().nullable();
      table.boolean('is_from_user').defaultTo(true);
      table.json('interactive_reply').nullable();
      table.string('flow_token', 255).nullable();
      
      // Índices
      table.index('user_id');
      table.index('delivery_status');
      table.index('is_from_user');
      table.index('thread_id');
    });
    
    // Foreign keys
    await knex.schema.table('whatsapp_messages', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
      table.foreign('reply_to_message_id').references('whatsapp_messages.id').onDelete('SET NULL');
      table.foreign('thread_id').references('whatsapp_messages.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_messages atualizada');
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_messages', 'delivery_status');
  
  if (hasColumn) {
    await knex.schema.table('whatsapp_messages', (table) => {
      table.dropForeign('user_id');
      table.dropForeign('reply_to_message_id');
      table.dropForeign('thread_id');
      table.dropColumn('user_id');
      table.dropColumn('delivery_status');
      table.dropColumn('reply_to_message_id');
      table.dropColumn('thread_id');
      table.dropColumn('is_from_user');
      table.dropColumn('interactive_reply');
      table.dropColumn('flow_token');
    });
  }
};
