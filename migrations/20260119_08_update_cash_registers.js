'use strict';

/**
 * Migration: Atualizar tabela cash_registers com campos faltantes
 * Adiciona: expected_amount, difference
 */

exports.up = async function(knex) {
  await knex.schema.table('cash_registers', (table) => {
    // Adicionar novos campos se não existirem
    if (!(await knex.schema.hasColumn('cash_registers', 'expected_amount'))) {
      table.decimal('expected_amount', 10, 2).defaultTo(0);
    }
    if (!(await knex.schema.hasColumn('cash_registers', 'difference'))) {
      table.decimal('difference', 10, 2).defaultTo(0);
    }
  });

  console.log('[Migration] Tabela cash_registers atualizada com novos campos');
};

exports.down = async function(knex) {
  await knex.schema.table('cash_registers', (table) => {
    // Remover campos adicionados
    if (await knex.schema.hasColumn('cash_registers', 'expected_amount')) {
      table.dropColumn('expected_amount');
    }
    if (await knex.schema.hasColumn('cash_registers', 'difference')) {
      table.dropColumn('difference');
    }
  });

  console.log('[Migration] Campos removidos da tabela cash_registers');
};
