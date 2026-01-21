'use strict';

/**
 * Migration: Atualizar tabela expenses com campos faltantes
 * Adiciona: supplier_name, invoice_number, is_recurring, notes
 */

exports.up = async function(knex) {
  // Verificar se a tabela exists
  const tableExists = await knex.schema.hasTable('expenses');
  
  if (!tableExists) {
    console.log('[Migration] Tabela expenses não existe, migrando para version de update');
    return;
  }

  const hasSupplierName = await knex.schema.hasColumn('expenses', 'supplier_name');
  const hasInvoiceNumber = await knex.schema.hasColumn('expenses', 'invoice_number');
  const hasIsRecurring = await knex.schema.hasColumn('expenses', 'is_recurring');
  const hasNotes = await knex.schema.hasColumn('expenses', 'notes');

  await knex.schema.table('expenses', (table) => {
    // Adicionar novos campos se não existirem
    if (!hasSupplierName) {
      table.string('supplier_name', 255).nullable();
    }
    if (!hasInvoiceNumber) {
      table.string('invoice_number', 50).nullable();
    }
    if (!hasIsRecurring) {
      table.boolean('is_recurring').defaultTo(false);
    }
    if (!hasNotes) {
      table.text('notes').nullable();
    }
  });

  console.log('[Migration] Tabela expenses atualizada com novos campos');
};

exports.down = async function(knex) {
  const tableExists = await knex.schema.hasTable('expenses');
  
  if (!tableExists) {
    return;
  }

  const hasSupplierName = await knex.schema.hasColumn('expenses', 'supplier_name');
  const hasInvoiceNumber = await knex.schema.hasColumn('expenses', 'invoice_number');
  const hasIsRecurring = await knex.schema.hasColumn('expenses', 'is_recurring');
  const hasNotes = await knex.schema.hasColumn('expenses', 'notes');

  await knex.schema.table('expenses', (table) => {
    // Remover campos adicionados
    if (hasSupplierName) {
      table.dropColumn('supplier_name');
    }
    if (hasInvoiceNumber) {
      table.dropColumn('invoice_number');
    }
    if (hasIsRecurring) {
      table.dropColumn('is_recurring');
    }
    if (hasNotes) {
      table.dropColumn('notes');
    }
  });

  console.log('[Migration] Campos removidos da tabela expenses');
};
