'use strict';

/**
 * Migration: Criar tabelas de receitas
 * Armazena receitas de pratos e seus ingredientes para cálculo de capacidade de produção
 */

exports.up = async function(knex) {
  // Tabela recipes
  await knex.schema.createTable('recipes', (table) => {
    table.string('id', 50).primary();
    table.string('product_id', 50).notNullable().unique();
    table.text('notes').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Índices
    table.index('product_id');
    table.index('is_active');
    
    // Foreign key
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });

  // Tabela recipe_items (ingredientes da receita)
  await knex.schema.createTable('recipe_items', (table) => {
    table.increments('id').primary();
    table.string('recipe_id', 50).notNullable();
    table.string('ingredient_id', 50).notNullable();
    table.decimal('quantity', 10, 3).notNullable();
    table.string('unit', 20).defaultTo('un').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    
    // Índices
    table.index('recipe_id');
    table.index('ingredient_id');
    
    // Foreign keys
    table.foreign('recipe_id').references('id').inTable('recipes').onDelete('CASCADE');
    table.foreign('ingredient_id').references('id').inTable('products').onDelete('RESTRICT');
  });

  console.log('[Migration] Tabelas recipes e recipe_items criadas com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('recipe_items');
  await knex.schema.dropTableIfExists('recipes');
  console.log('[Migration] Tabelas recipes e recipe_items removidas');
};
