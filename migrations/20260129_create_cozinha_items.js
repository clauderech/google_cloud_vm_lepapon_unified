export async function up(knex) {
  const exists = await knex.schema.hasTable('cozinha_items');
  if (exists) {
    return;
  }

  return knex.schema.createTable('cozinha_items', function(table) {
    table.increments('id').primary();
    table.integer('comanda_id').notNullable().references('id').inTable('comandas');
    table.integer('product_id').notNullable().references('id').inTable('products');
    table.integer('quantidade').notNullable();
    table.string('status').notNullable().defaultTo('pending');
    table.string('observacao');
    table.string('prioridade').notNullable().defaultTo('normal'); // 'normal' ou 'urgente'
    table.string('responsavel'); // campo livre
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  const exists = await knex.schema.hasTable('cozinha_items');
  if (!exists) {
    return;
  }

  return knex.schema.dropTable('cozinha_items');
}
