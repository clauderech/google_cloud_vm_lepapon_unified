export function up(knex) {
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

export function down(knex) {
  return knex.schema.dropTable('cozinha_items');
}
