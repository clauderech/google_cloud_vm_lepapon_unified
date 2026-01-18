'use strict';

/**
 * Migration: Adicionar campo customer_id à tabela whatsapp_orders
 */

exports.up = function(knex) {
  return knex.schema.table('whatsapp_orders', function(table) {
    table.string('customer_id', 50).nullable().comment('ID do cliente na tabela customers');
    table.index('customer_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('whatsapp_orders', function(table) {
    table.dropIndex('customer_id');
    table.dropColumn('customer_id');
  });
};
