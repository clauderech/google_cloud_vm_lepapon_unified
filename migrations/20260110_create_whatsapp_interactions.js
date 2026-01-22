'use strict';

/**
 * Cria tabela para persistir interações com buttons e lists do WhatsApp
 * 
 * Estrutura:
 * - user_id: Proprietário da interação
 * - wa_message_id: ID único da mensagem interativa
 * - wa_timestamp: Timestamp da mensagem original
 * - interaction_type: 'button_reply' ou 'list_reply'
 * - button_id: ID do botão pressionado (para rastrear qual foi clicado)
 * - button_title: Título do botão/item selecionado
 * - button_description: Descrição do botão/item
 * - raw_data: JSON completo da resposta para auditoria
 * - created_at: Data de criação
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_interactions');
  
  if (!hasTable) {
    console.log('[Migration] Criando tabela whatsapp_interactions');
    await knex.schema.createTable('whatsapp_interactions', (table) => {
      table.increments('id').primary();
      
      // Relacionamento com usuário
      table.integer('user_id').notNullable();
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
      
      // IDs do WhatsApp
      table.string('wa_message_id', 255).notNullable();
      table.bigInteger('wa_timestamp').nullable();
      
      // Tipo de interação
      table.enum('interaction_type', ['button_reply', 'list_reply']).notNullable();
      
      // Dados da interação
      table.string('button_id', 255).nullable();
      table.text('button_title').nullable();
      table.text('button_description').nullable();
      
      // Dados completos para auditoria/debug
      table.json('raw_data').nullable();
      
      // Timestamps
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index('user_id');
      table.index('wa_message_id');
      table.index('interaction_type');
      table.index('created_at');
      
      // Único por mensagem (não duplicar interações)
      table.unique(['wa_message_id']);
    });
  }
};

exports.down = async function down(knex) {
  console.log('[Migration] Removendo tabela whatsapp_interactions');
  await knex.schema.dropTableIfExists('whatsapp_interactions');
};
