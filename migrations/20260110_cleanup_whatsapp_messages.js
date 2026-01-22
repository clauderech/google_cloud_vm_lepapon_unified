'use strict';

/**
 * Remove campos desnecessários da tabela whatsapp_messages
 * e adiciona filtro para não persistir 'order' e 'interactive'
 * 
 * Campo removido:
 * - wa_from: Redundante (vem do user_id)
 * 
 * Campos mantidos:
 * - user_id: Proprietário da mensagem
 * - wa_message_id: ID único do WhatsApp
 * - wa_timestamp: Timestamp da mensagem
 * - wa_type: Tipo (text, image, audio, video, document)
 * - text: Conteúdo textual
 * - media_*: Dados da mídia (id, mime_type, caption)
 * - is_from_user: Se veio do usuário ou do bot
 * - created_at: Timestamp de criação no DB
 * 
 * Tipos que NÃO são persistidos:
 * - order: Persistido em whatsapp_orders
 * - interactive: Persistido em whatsapp_flow_sessions ou whatsapp_interactions
 */

exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_messages', 'wa_from');
  
  if (hasColumn) {
    console.log('[Migration] Removendo coluna wa_from de whatsapp_messages');
    await knex.schema.table('whatsapp_messages', (table) => {
      table.dropColumn('wa_from');
    });
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_messages', 'wa_from');
  
  if (!hasColumn) {
    console.log('[Migration] Readicionando coluna wa_from em whatsapp_messages');
    await knex.schema.table('whatsapp_messages', (table) => {
      table.string('wa_from', 32).nullable().after('wa_message_id');
    });
  }
};
