exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE products
    MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda', 'sorvete') NOT NULL
  `);
};

exports.down = async function down(knex) {
  await knex('products').where({ type: 'sorvete' }).update({ type: 'revenda' });

  await knex.raw(`
    ALTER TABLE products
    MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda') NOT NULL
  `);
};
