'use strict';

/**
 * Remove tabela obsoleta whatsapp_first_responses
 * Agora usamos whatsapp_messages com status de entrega
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_first_responses');
  
  if (hasTable) {
    await knex.schema.dropTable('whatsapp_first_responses');
    console.log('[Migration] Tabela whatsapp_first_responses removida');
  }
};

exports.down = async function down(knex) {
  // Não recriamos a tabela obsoleta
  return Promise.resolve();
};
