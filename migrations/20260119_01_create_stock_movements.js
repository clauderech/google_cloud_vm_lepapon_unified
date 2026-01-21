'use strict';

/**
 * Migration: Criar tabela de movimentação de estoque
 * Rastreia todas as entradas, saídas, ajustes e perdas de estoque
 */

exports.up = async function(knex) {
  // Criar tabela
  await knex.schema.createTable('stock_movements', (table) => {
    table.increments('id').primary();
    table.string('product_id', 50).notNullable();
    table.enum('movement_type', ['entrada', 'saida', 'ajuste', 'perda', 'devolucao']).notNullable();
    table.decimal('quantity', 10, 3).notNullable();
    table.decimal('previous_stock', 10, 3).notNullable();
    table.decimal('new_stock', 10, 3).notNullable();
    table.enum('reference_type', ['sale', 'purchase', 'adjustment', 'recipe', 'loss', 'return']).nullable();
    table.string('reference_id', 50).nullable(); // sale_id, purchase_id, comanda_id, etc
    table.decimal('cost_impact', 10, 2).nullable();
    table.text('notes').nullable();
    table.string('created_by', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices para performance
    table.index(['product_id', 'created_at']);
    table.index('movement_type');
    table.index('reference_type');
    table.index('created_at');
    
    // Foreign key
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });

  console.log('[Migration] Tabela stock_movements criada com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('stock_movements');
  console.log('[Migration] Tabela stock_movements removida');
};
