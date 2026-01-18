'use strict';

/**
 * Migration: Criar tabela de pagamentos mensais
 * Registra pagamentos feitos pelo cliente na conta mensal
 */

exports.up = async function(knex) {
  await knex.schema.createTable('monthly_payments', (table) => {
    table.increments('id').primary();
    table.integer('monthly_account_id').unsigned().notNullable();
    table.timestamp('payment_date').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.enum('payment_method', ['cash', 'card', 'pix', 'transfer']).notNullable();
    table.string('receipt_number', 50).nullable();
    table.string('received_by', 100).nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('monthly_account_id');
    table.index('payment_date');
    
    // Foreign key
    table.foreign('monthly_account_id').references('id').inTable('monthly_accounts').onDelete('CASCADE');
  });

  console.log('[Migration] Tabela monthly_payments criada');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monthly_payments');
  console.log('[Migration] Tabela monthly_payments removida');
};
