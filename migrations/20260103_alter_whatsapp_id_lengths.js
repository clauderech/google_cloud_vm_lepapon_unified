'use strict';

/**
 * Ajusta o tamanho dos IDs do WhatsApp (wamid...) para evitar ER_DATA_TOO_LONG.
 *
 * Motivo: IDs de mensagem do WhatsApp podem exceder 64 caracteres.
 */

async function alterMessages(knex) {
  const has = await knex.schema.hasTable('whatsapp_messages');
  if (!has) return;

  // Verificar se a coluna existe
  const hasColumn = await knex.schema.hasColumn('whatsapp_messages', 'wa_message_id');
  if (!hasColumn) {
    console.log('Coluna wa_message_id não existe em whatsapp_messages, pulando alteração');
    return;
  }

  // Tenta dropar o índice único se existir
  try {
    await knex.schema.alterTable('whatsapp_messages', (table) => {
      table.dropUnique(['wa_message_id']);
    });
  } catch (err) {
    // Índice não existe, continue
    console.log('Índice wa_message_id não encontrado em whatsapp_messages, continuando...');
  }

  // Alterar coluna para varchar(255)
  try {
    await knex.schema.alterTable('whatsapp_messages', (table) => {
      table.string('wa_message_id', 255).notNullable().alter();
    });
  } catch (err) {
    console.log('Erro ao alterar coluna wa_message_id:', err.message);
  }

  // Recriar índice único
  try {
    await knex.schema.alterTable('whatsapp_messages', (table) => {
      table.unique(['wa_message_id']);
    });
  } catch (err) {
    console.log('Erro ao criar índice único:', err.message);
  }
}

async function alterStatuses(knex) {
  const has = await knex.schema.hasTable('whatsapp_statuses');
  if (!has) return;

  // Verificar se a coluna existe
  const hasColumn = await knex.schema.hasColumn('whatsapp_statuses', 'wa_message_id');
  if (!hasColumn) {
    console.log('Coluna wa_message_id não existe em whatsapp_statuses, pulando alteração');
    return;
  }

  // Tenta dropar o índice único se existir
  try {
    await knex.schema.alterTable('whatsapp_statuses', (table) => {
      table.dropUnique(['wa_message_id', 'wa_status', 'wa_timestamp']);
    });
  } catch (err) {
    // Índice não existe, continue
    console.log('Índice composto não encontrado em whatsapp_statuses, continuando...');
  }

  // Alterar coluna para varchar(255)
  try {
    await knex.schema.alterTable('whatsapp_statuses', (table) => {
      table.string('wa_message_id', 255).notNullable().alter();
    });
  } catch (err) {
    console.log('Erro ao alterar coluna wa_message_id em whatsapp_statuses:', err.message);
  }

  // Recriar índice único
  try {
    await knex.schema.alterTable('whatsapp_statuses', (table) => {
      table.unique(['wa_message_id', 'wa_status', 'wa_timestamp']);
    });
  } catch (err) {
    console.log('Erro ao criar índice composto em whatsapp_statuses:', err.message);
  }
}

async function alterFirstResponses(knex) {
  const has = await knex.schema.hasTable('whatsapp_first_responses');
  if (!has) return;

  // Verificar se a coluna existe
  const hasColumn = await knex.schema.hasColumn('whatsapp_first_responses', 'wa_message_id');
  if (!hasColumn) {
    console.log('Coluna wa_message_id não existe em whatsapp_first_responses, pulando alteração');
    return;
  }

  // Tenta dropar o índice único se existir
  try {
    await knex.schema.alterTable('whatsapp_first_responses', (table) => {
      table.dropUnique(['wa_message_id']);
    });
  } catch (err) {
    // Índice não existe, continue
    console.log('Índice wa_message_id não encontrado em whatsapp_first_responses, continuando...');
  }

  // Alterar coluna para varchar(255)
  try {
    await knex.schema.alterTable('whatsapp_first_responses', (table) => {
      table.string('wa_message_id', 255).notNullable().alter();
    });
  } catch (err) {
    console.log('Erro ao alterar coluna wa_message_id em whatsapp_first_responses:', err.message);
  }

  // Recriar índice único
  try {
    await knex.schema.alterTable('whatsapp_first_responses', (table) => {
      table.unique(['wa_message_id']);
    });
  } catch (err) {
    console.log('Erro ao criar índice único em whatsapp_first_responses:', err.message);
  }
}

exports.up = async function up(knex) {
  await alterMessages(knex);
  await alterStatuses(knex);
  await alterFirstResponses(knex);
};

exports.down = async function down(knex) {
  // Não reduzimos de volta para evitar perder dados.
};
