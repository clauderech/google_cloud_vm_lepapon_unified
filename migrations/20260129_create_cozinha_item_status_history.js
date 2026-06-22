export async function up(knex) {
  const exists = await knex.schema.hasTable('cozinha_item_status_history');
  if (exists) {
    return;
  }

  return knex.schema.createTable('cozinha_item_status_history', function(table) {
    table.increments('id').primary();
    table.integer('cozinha_item_id').notNullable().references('id').inTable('cozinha_items');
    table.string('status').notNullable();
    table.string('responsavel');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  const exists = await knex.schema.hasTable('cozinha_item_status_history');
  if (!exists) {
    return;
  }

  return knex.schema.dropTable('cozinha_item_status_history');
}
