'use strict';

/**
 * Migration: Criar tabela de comandas
 * Pedidos abertos em PDV ou via LePapon (WhatsApp)
 */

exports.up = async function(knex) {
  await knex.schema.createTable('comandas', (table) => {
    table.string('id', 50).primary();
    table.string('customer_id', 50).nullable();
    table.string('customer_name', 255).notNullable();
    table.string('table_number', 10).nullable(); // Número da mesa (PDV)
    table.timestamp('opened_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('closed_at').nullable();
    table.decimal('total', 10, 2).defaultTo(0);
    table.enum('status', ['open', 'closed', 'cancelled']).defaultTo('open').notNullable();
    table.enum('payment_method', ['cash', 'card', 'pix', 'credit']).nullable();
    table.enum('source', ['pos', 'lepapon']).defaultTo('pos').notNullable();
    table.string('lepapon_session_id', 255).nullable(); // Para integração LePapon
    table.integer('lepapon_order_id').nullable(); // ID do pedido no WhatsApp
    table.string('order_status', 50).nullable(); // Status do pedido (pending, confirmed, etc)
    table.string('payment_status', 50).nullable(); // Status do pagamento
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Índices para performance
    table.index(['status', 'source']);
    table.index('customer_id');
    table.index('table_number');
    table.index('lepapon_order_id');
    table.index('created_at');
    
    // Foreign key
    table.foreign('customer_id').references('id').inTable('customers').onDelete('SET NULL');
  });

  console.log('[Migration] Tabela comandas criada com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('comandas');
  console.log('[Migration] Tabela comandas removida');
};
