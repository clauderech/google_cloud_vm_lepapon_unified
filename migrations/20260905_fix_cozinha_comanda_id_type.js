'use strict';

exports.up = async function up(knex) {
  const exists = await knex.schema.hasTable('cozinha_items');
  if (!exists) return;

  const columns = await knex('cozinha_items').columnInfo();
  const type = String(columns.comanda_id?.type || '').toLowerCase();
  if (!type || ['varchar', 'char', 'text'].includes(type)) return;

  await knex.schema.alterTable('cozinha_items', (table) => {
    table.dropForeign(['comanda_id']);
  });

  await knex.schema.alterTable('cozinha_items', (table) => {
    table.string('comanda_id', 50).notNullable().alter();
  });

  await knex.schema.alterTable('cozinha_items', (table) => {
    table.foreign('comanda_id').references('id').inTable('comandas');
  });
};

exports.down = async function down(knex) {
  const exists = await knex.schema.hasTable('cozinha_items');
  if (!exists) return;

  await knex.schema.alterTable('cozinha_items', (table) => {
    table.dropForeign(['comanda_id']);
  });

  await knex.schema.alterTable('cozinha_items', (table) => {
    table.integer('comanda_id').notNullable().alter();
  });
};
