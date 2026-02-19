/**
 * Cria tabela para compras mensais de crediário
 * Data: 19 de fevereiro de 2026
 */

export async function up(knex) {
  const hasMonthlyPurchases = await knex.schema.hasTable('monthly_purchases');
  if (!hasMonthlyPurchases) {
    await knex.schema.createTable('monthly_purchases', (table) => {
      table.increments('id').primary();
      
      table.integer('monthly_account_id').unsigned().notNullable();
      table.string('sale_id', 255).nullable(); // ID da venda/comanda relacionada
      table.timestamp('purchase_date').notNullable();
      table.string('description', 500).notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.text('items_json').nullable(); // JSON detalhado dos itens comprados
      
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index(['monthly_account_id']);
      table.index(['purchase_date']);
      table.index(['sale_id']);
      
      // Foreign key para monthly_accounts
      table.foreign('monthly_account_id').references('id').inTable('monthly_accounts').onDelete('CASCADE');
    });
    
    console.log('Tabela monthly_purchases criada com sucesso');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('monthly_purchases');
  console.log('Tabela monthly_purchases removida');
}