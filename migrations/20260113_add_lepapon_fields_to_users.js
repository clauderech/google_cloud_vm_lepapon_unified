/**
 * Migration: Adicionar campo lepapon_session_id à tabela whatsapp_users
 */

exports.up = function(knex) {
  return knex.schema.table('whatsapp_users', function(table) {
    table.string('lepapon_session_id', 50).nullable().comment('Session ID do cliente LePapon');
    table.index('lepapon_session_id');
  });
};

exports.down = function(knex) {
  return knex.schema.table('whatsapp_users', function(table) {
    table.dropIndex('lepapon_session_id');
    table.dropColumn('lepapon_session_id');
  });
};
