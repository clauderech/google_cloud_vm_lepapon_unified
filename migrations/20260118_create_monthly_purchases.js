'use strict';

/**
 * Migration: Criar tabela de compras mensais
 * Registra cada compra feita no crediário durante o mês
 */

exports.up = async function(knex) {
  await knex.schema.createTable('monthly_purchases', (table) => {
    table.increments('id').primary();
    table.integer('monthly_account_id').unsigned().notNullable();
    table.string('sale_id', 50).nullable();
    table.date('purchase_date').notNullable();
    table.text('description').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.text('items_json').nullable(); // JSON com detalhes dos itens
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('monthly_account_id');
    table.index('purchase_date');
    table.index('sale_id');
    
    // Foreign keys
    table.foreign('monthly_account_id').references('id').inTable('monthly_accounts').onDelete('CASCADE');
  });

  console.log('[Migration] Tabela monthly_purchases criada');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monthly_purchases');
  console.log('[Migration] Tabela monthly_purchases removida');
};
