exports.up = async function up(knex) {
  await knex.raw(`
    ALTER TABLE products
    MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda', 'sorvete', 'destilado') NOT NULL
  `);
};

exports.down = async function down(knex) {
  await knex.raw(`
    ALTER TABLE products
    MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda', 'sorvete') NOT NULL
  `);
};