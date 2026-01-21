'use strict';

/**
 * Migration: Criar tabela de itens em comandas
 * Itens (produtos) dentro de uma comanda aberta
 */

exports.up = async function(knex) {
  await knex.schema.createTable('comanda_items', (table) => {
    table.increments('id').primary();
    table.string('comanda_id', 50).notNullable();
    table.string('product_id', 50).notNullable();
    table.string('product_name', 255).notNullable();
    table.decimal('quantity', 10, 3).notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.enum('status', ['pending', 'preparing', 'ready', 'delivered']).defaultTo('pending').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Índices para performance
    table.index('comanda_id');
    table.index('product_id');
    table.index('status');
    
    // Foreign keys
    table.foreign('comanda_id').references('id').inTable('comandas').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('RESTRICT');
  });

  console.log('[Migration] Tabela comanda_items criada com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('comanda_items');
  console.log('[Migration] Tabela comanda_items removida');
};
