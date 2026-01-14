exports.up = function(knex) {
  return knex.schema.createTable('cash_registers', table => {
    table.increments('id').primary();
    table.date('date').notNullable();
    table.decimal('initial_amount', 10, 2).notNullable();
    table.string('opened_by', 255).notNullable();
    table.timestamp('opened_at').notNullable();
    table.decimal('final_amount', 10, 2).nullable();
    table.string('closed_by', 255).nullable();
    table.timestamp('closed_at').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
    
    table.index('date');
    table.index('closed_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('cash_registers');
};
