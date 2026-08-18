export async function up(knex) {
  const hasTable = await knex.schema.hasTable('shopping_list_items');
  if (hasTable) return;

  await knex.schema.createTable('shopping_list_items', (table) => {
    table.string('id', 255).primary();
    table.string('product_id', 255).notNullable();
    table.string('supplier_id', 255).nullable();
    table.decimal('quantity', 10, 3).notNullable();
    table.enum('priority', ['low', 'medium', 'high', 'urgent']).notNullable().defaultTo('medium');
    table.boolean('is_purchased').notNullable().defaultTo(false);
    table.timestamp('purchased_at').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table.index(['product_id']);
    table.index(['supplier_id']);
    table.index(['is_purchased']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('shopping_list_items');
}