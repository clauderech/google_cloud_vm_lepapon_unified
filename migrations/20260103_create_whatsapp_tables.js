

/**
 * Cria tabelas para persistir mensagens e statuses do WhatsApp Cloud API.
 */

export async function up(knex) {
  const hasMessages = await knex.schema.hasTable('whatsapp_messages');
  if (!hasMessages) {
    await knex.schema.createTable('whatsapp_messages', (table) => {
      table.increments('id').primary();

      table.string('wa_message_id', 255).notNullable();
      table.string('wa_from', 32).nullable();
      table.bigInteger('wa_timestamp').nullable();
      table.string('wa_type', 32).nullable();

      table.text('text').nullable();

      table.string('media_kind', 16).nullable();
      table.string('media_id', 128).nullable();
      table.string('media_mime_type', 96).nullable();
      table.string('media_sha256', 128).nullable();
      table.string('media_filename', 255).nullable();
      table.text('media_caption').nullable();

      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['wa_message_id']);
    });
  }

  const hasStatuses = await knex.schema.hasTable('whatsapp_statuses');
  if (!hasStatuses) {
    await knex.schema.createTable('whatsapp_statuses', (table) => {
      table.increments('id').primary();

      table.string('wa_message_id', 255).notNullable();
      table.string('wa_status', 32).nullable();
      table.bigInteger('wa_timestamp').nullable();
      table.string('recipient_id', 32).nullable();
      table.string('conversation_id', 128).nullable();
      table.string('pricing_category', 32).nullable();

      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      table.unique(['wa_message_id', 'wa_status', 'wa_timestamp']);
    });
  }
};

export async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_statuses');
  await knex.schema.dropTableIfExists('whatsapp_messages');
}
