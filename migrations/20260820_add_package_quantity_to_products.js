exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('products', 'package_quantity');

  if (!hasColumn) {
    await knex.schema.table('products', (table) => {
      table.integer('package_quantity').notNullable().defaultTo(1).after('stock');
    });

    console.log('[MIGRATION] Coluna package_quantity adicionada à tabela products');
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('products', 'package_quantity');

  if (hasColumn) {
    await knex.schema.table('products', (table) => {
      table.dropColumn('package_quantity');
    });
  }
};
