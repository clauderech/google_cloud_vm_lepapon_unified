'use strict';

/**
 * Migration: Criar tabela de transações de fidelidade
 * Rastreia ganho e uso de pontos de fidelidade
 */

exports.up = async function(knex) {
  await knex.schema.createTable('loyalty_transactions', (table) => {
    table.increments('id').primary();
    table.string('customer_id', 50).notNullable();
    table.integer('points_change').notNullable(); // Positivo = ganho, Negativo = resgate
    table.enum('transaction_type', ['purchase', 'reward_redeemed', 'manual_adjustment', 'expired']).notNullable();
    table.string('reference_id', 50).nullable(); // sale_id ou comanda_id
    table.text('notes').nullable();
    table.string('created_by', 100).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    
    // Índices para performance
    table.index(['customer_id', 'created_at']);
    table.index('transaction_type');
    table.index('reference_id');
    
    // Foreign key
    table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
  });

  console.log('[Migration] Tabela loyalty_transactions criada com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('loyalty_transactions');
  console.log('[Migration] Tabela loyalty_transactions removida');
};
