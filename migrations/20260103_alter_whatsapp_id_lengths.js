'use strict';

/**
 * Ajusta o tamanho dos IDs do WhatsApp (wamid...) para evitar ER_DATA_TOO_LONG.
 *
 * Motivo: IDs de mensagem do WhatsApp podem exceder 64 caracteres.
 */

async function alterMessages(knex) {
  const has = await knex.schema.hasTable('whatsapp_messages');
  if (!has) return;

  await knex.schema.alterTable('whatsapp_messages', (table) => {
    table.dropUnique(['wa_message_id']);
  });

  await knex.schema.alterTable('whatsapp_messages', (table) => {
    table.string('wa_message_id', 255).notNullable().alter();
  });

  await knex.schema.alterTable('whatsapp_messages', (table) => {
    table.unique(['wa_message_id']);
  });
}

async function alterStatuses(knex) {
  const has = await knex.schema.hasTable('whatsapp_statuses');
  if (!has) return;

  await knex.schema.alterTable('whatsapp_statuses', (table) => {
    table.dropUnique(['wa_message_id', 'wa_status', 'wa_timestamp']);
  });

  await knex.schema.alterTable('whatsapp_statuses', (table) => {
    table.string('wa_message_id', 255).notNullable().alter();
  });

  await knex.schema.alterTable('whatsapp_statuses', (table) => {
    table.unique(['wa_message_id', 'wa_status', 'wa_timestamp']);
  });
}

async function alterFirstResponses(knex) {
  const has = await knex.schema.hasTable('whatsapp_first_responses');
  if (!has) return;

  await knex.schema.alterTable('whatsapp_first_responses', (table) => {
    table.dropUnique(['wa_message_id']);
  });

  await knex.schema.alterTable('whatsapp_first_responses', (table) => {
    table.string('wa_message_id', 255).notNullable().alter();
  });

  await knex.schema.alterTable('whatsapp_first_responses', (table) => {
    table.unique(['wa_message_id']);
  });
}

exports.up = async function up(knex) {
  await alterMessages(knex);
  await alterStatuses(knex);
  await alterFirstResponses(knex);
};

exports.down = async function down(knex) {
  // Não reduzimos de volta para evitar perder dados.
};
