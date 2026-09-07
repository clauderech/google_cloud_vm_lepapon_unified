exports.up = async function up(knex) {
  const hasSellable = await knex.schema.hasColumn('products', 'is_sellable');
  const hasIngredient = await knex.schema.hasColumn('products', 'is_ingredient');

  if (!hasSellable) {
    await knex.schema.table('products', (table) => {
      table.boolean('is_sellable').nullable().after('type');
    });
  }

  if (!hasIngredient) {
    await knex.schema.table('products', (table) => {
      table.boolean('is_ingredient').nullable().after('is_sellable');
    });
  }
};

exports.down = async function down(knex) {
  const hasSellable = await knex.schema.hasColumn('products', 'is_sellable');
  const hasIngredient = await knex.schema.hasColumn('products', 'is_ingredient');

  if (hasIngredient) {
    await knex.schema.table('products', (table) => {
      table.dropColumn('is_ingredient');
    });
  }

  if (hasSellable) {
    await knex.schema.table('products', (table) => {
      table.dropColumn('is_sellable');
    });
  }
};