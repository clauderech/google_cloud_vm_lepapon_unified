'use strict';

/**
 * Migration: Criar tabela de contas mensais (crediário mensal)
 * Sistema de caderno de fiado onde cliente acumula compras no mês
 */

exports.up = async function(knex) {
  await knex.schema.createTable('monthly_accounts', (table) => {
    table.increments('id').primary();
    table.string('customer_id', 50).notNullable();
    table.string('month_year', 7).notNullable(); // Ex: '2026-01'
    table.decimal('total_amount', 10, 2).defaultTo(0);
    table.decimal('amount_paid', 10, 2).defaultTo(0);
    table.decimal('balance', 10, 2).defaultTo(0);
    table.date('due_date').nullable();
    table.enum('status', ['open', 'closed', 'paid', 'overdue']).defaultTo('open');
    table.decimal('late_fee', 10, 2).defaultTo(0);
    table.decimal('interest', 10, 2).defaultTo(0);
    table.date('payment_date').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('customer_id');
    table.index('month_year');
    table.index('status');
    table.unique(['customer_id', 'month_year']); // Um cliente pode ter apenas uma conta por mês
    
    // Foreign key
    table.foreign('customer_id').references('id').inTable('customers').onDelete('CASCADE');
  });

  console.log('[Migration] Tabela monthly_accounts criada');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('monthly_accounts');
  console.log('[Migration] Tabela monthly_accounts removida');
};
