exports.up = function(knex) {
  return knex.schema.createTable('cash_movements', table => {
    table.increments('id').primary();
    table.integer('register_id').unsigned().notNullable();
    table.enum('type', ['sale', 'expense', 'adjustment']).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('description', 500).nullable();
    table.string('category', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('register_id');
    table.index('type');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cash_movements');
};
