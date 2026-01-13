/**
 * Migration: Adicionar campos LePapon à tabela whatsapp_orders
 */

exports.up = function(knex) {
  return knex.schema.table('whatsapp_orders', function(table) {
    // Campos para origem LePapon
    table.string('source', 50).defaultTo('whatsapp').comment('Origem do pedido: whatsapp ou lepapon');
    table.bigInteger('lepapon_order_id').nullable().comment('ID do pedido no sistema LePapon');
    table.string('lepapon_session_id', 50).nullable().comment('Session ID do cliente LePapon (usado como telefone)');
    
    // Índices para queries rápidas
    table.index('source');
    table.index('lepapon_order_id');
    table.index('lepapon_session_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('whatsapp_orders', function(table) {
    table.dropIndex('source');
    table.dropIndex('lepapon_order_id');
    table.dropIndex('lepapon_session_id');
    
    table.dropColumn('source');
    table.dropColumn('lepapon_order_id');
    table.dropColumn('lepapon_session_id');
  });
};
