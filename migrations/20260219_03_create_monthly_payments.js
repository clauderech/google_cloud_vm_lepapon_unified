/**
 * Cria tabela para pagamentos mensais de crediário
 * Data: 19 de fevereiro de 2026
 */

export async function up(knex) {
  const hasMonthlyPayments = await knex.schema.hasTable('monthly_payments');
  if (!hasMonthlyPayments) {
    await knex.schema.createTable('monthly_payments', (table) => {
      table.increments('id').primary();
      
      table.integer('monthly_account_id').unsigned().notNullable();
      table.date('payment_date').notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.enum('payment_method', ['cash', 'card', 'pix', 'transfer']).notNullable();
      table.string('receipt_number', 100).nullable();
      table.string('received_by', 100).nullable();
      table.text('notes').nullable();
      
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index(['monthly_account_id']);
      table.index(['payment_date']);
      table.index(['payment_method']);
      
      // Foreign key para monthly_accounts
      table.foreign('monthly_account_id').references('id').inTable('monthly_accounts').onDelete('CASCADE');
    });
    
    console.log('Tabela monthly_payments criada com sucesso');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('monthly_payments');
  console.log('Tabela monthly_payments removida');
}