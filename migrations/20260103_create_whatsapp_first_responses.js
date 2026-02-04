

/**
 * Garante idempotência do "first response" (evita enviar o template duas vezes
 * para a mesma mensagem caso o webhook seja reenviado).
 */

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_first_responses');
  if (hasTable) return;

  await knex.schema.createTable('whatsapp_first_responses', (table) => {
    table.increments('id').primary();
    table.string('wa_message_id', 255).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.unique(['wa_message_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_first_responses');
}
