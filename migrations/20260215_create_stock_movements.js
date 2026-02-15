/**
 * Cria tabela para auditoria de movimentações de estoque
 * Data: 15 de fevereiro de 2026
 */

export async function up(knex) {
  const hasStockMovements = await knex.schema.hasTable('stock_movements');
  if (!hasStockMovements) {
    await knex.schema.createTable('stock_movements', (table) => {
      table.increments('id').primary();
      
      table.string('product_id', 255).notNullable();
      table.enum('movement_type', ['sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage']).notNullable();
      table.decimal('quantity', 10, 3).notNullable();
      table.decimal('previous_stock', 10, 3).notNullable();
      table.decimal('new_stock', 10, 3).notNullable();
      
      // Referências para identificar a origem da movimentação
      table.enum('reference_type', ['sale', 'purchase', 'comanda', 'manual_adjustment']).notNullable();
      table.string('reference_id', 255).nullable(); // ID da venda, compra, etc.
      
      table.text('notes').nullable();
      table.string('user_id', 255).nullable(); // Quem fez a alteração
      
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index(['product_id']);
      table.index(['movement_type']);
      table.index(['reference_type', 'reference_id']);
      table.index(['created_at']);
    });
    
    console.log('Tabela stock_movements criada com sucesso');
  }
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('stock_movements');
  console.log('Tabela stock_movements removida');
}