/**
 * Cria tabela para contas mensais de crediário
 * Data: 19 de fevereiro de 2026
 */

export async function up(knex) {
  const hasMonthlyAccounts = await knex.schema.hasTable('monthly_accounts');
  if (!hasMonthlyAccounts) {
    await knex.schema.createTable('monthly_accounts', (table) => {
      table.increments('id').primary();
      
      table.string('customer_id', 255).notNullable();
      table.string('month_year', 7).notNullable(); // YYYY-MM format
      table.date('due_date').notNullable();
      table.decimal('total_amount', 10, 2).defaultTo(0);
      table.decimal('amount_paid', 10, 2).defaultTo(0);
      table.decimal('balance', 10, 2).defaultTo(0);
      table.enum('status', ['open', 'paid', 'overdue', 'cancelled']).defaultTo('open');
      
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index(['customer_id']);
      table.index(['month_year']);
      table.index(['status']);
      table.index(['due_date']);
      
      // Constraint única: um cliente só pode ter uma conta por mês
      table.unique(['customer_id', 'month_year']);
      
      // Foreign key para customers
      table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
    });
    
    console.log('Tabela monthly_accounts criada com sucesso');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('monthly_accounts');
  console.log('Tabela monthly_accounts removida');
}