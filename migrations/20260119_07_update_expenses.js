'use strict';

/**
 * Migration: Atualizar tabela expenses com campos faltantes
 * Adiciona: supplier_name, invoice_number, is_recurring, notes
 */

exports.up = async function(knex) {
  await knex.schema.table('expenses', (table) => {
    // Adicionar novos campos se não existirem
    if (!(await knex.schema.hasColumn('expenses', 'supplier_name'))) {
      table.string('supplier_name', 255).nullable();
    }
    if (!(await knex.schema.hasColumn('expenses', 'invoice_number'))) {
      table.string('invoice_number', 50).nullable();
    }
    if (!(await knex.schema.hasColumn('expenses', 'is_recurring'))) {
      table.boolean('is_recurring').defaultTo(false);
    }
    if (!(await knex.schema.hasColumn('expenses', 'notes'))) {
      table.text('notes').nullable();
    }
  });

  console.log('[Migration] Tabela expenses atualizada com novos campos');
};

exports.down = async function(knex) {
  await knex.schema.table('expenses', (table) => {
    // Remover campos adicionados
    if (await knex.schema.hasColumn('expenses', 'supplier_name')) {
      table.dropColumn('supplier_name');
    }
    if (await knex.schema.hasColumn('expenses', 'invoice_number')) {
      table.dropColumn('invoice_number');
    }
    if (await knex.schema.hasColumn('expenses', 'is_recurring')) {
      table.dropColumn('is_recurring');
    }
    if (await knex.schema.hasColumn('expenses', 'notes')) {
      table.dropColumn('notes');
    }
  });

  console.log('[Migration] Campos removidos da tabela expenses');
};
