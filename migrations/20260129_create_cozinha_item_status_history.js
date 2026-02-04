export function up(knex) {
  return knex.schema.createTable('cozinha_item_status_history', function(table) {
    table.increments('id').primary();
    table.integer('cozinha_item_id').notNullable().references('id').inTable('cozinha_items');
    table.string('status').notNullable();
    table.string('responsavel');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTable('cozinha_item_status_history');
}
