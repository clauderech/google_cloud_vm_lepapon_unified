exports.up = function(knex) {
  return knex.schema.createTable('expenses', table => {
    table.increments('id').primary();
    table.string('description', 500).notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('category', 100).nullable();
    table.enum('payment_method', ['cash', 'card', 'check', 'transfer']).defaultTo('cash');
    table.date('date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('date');
    table.index('category');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('expenses');
};
