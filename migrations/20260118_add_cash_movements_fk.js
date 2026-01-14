exports.up = function(knex) {
  return knex.schema.table('cash_movements', table => {
    table.foreign('register_id').references('id').inTable('cash_registers').onDelete('cascade');
  });
};

exports.down = function(knex) {
  return knex.schema.table('cash_movements', table => {
    table.dropForeign('register_id');
  });
};
