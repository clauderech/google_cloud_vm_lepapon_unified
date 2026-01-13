'use strict';

/**
 * Cria tabela de pedidos
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_orders');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_orders', (table) => {
      table.string('id', 255).primary();
      table.string('user_id', 255).notNullable();
      
      // Identificadores
      table.string('order_number', 50).unique();
      table.string('order_hash', 255).unique().nullable();
      
      // Origem do Pedido
      table.integer('source_message_id').unsigned().nullable();
      table.string('catalog_id', 100).nullable();
      
      // Status
      table.enum('order_status', [
        'pending',
        'confirmed',
        'processing',
        'ready',
        'in_transit',
        'delivered',
        'completed',
        'cancelled',
        'failed'
      ]).defaultTo('pending');
      
      table.enum('payment_status', [
        'pending',
        'approved',
        'rejected',
        'refunded'
      ]).nullable();
      
      // Dados do Pedido
      table.enum('delivery_type', ['pickup', 'delivery']).notNullable();
      
      // Endereço de Entrega
      table.string('delivery_address', 255).nullable();
      table.string('delivery_city', 100).nullable();
      table.string('delivery_state', 50).nullable();
      table.string('delivery_postal_code', 20).nullable();
      table.decimal('delivery_lat', 10, 8).nullable();
      table.decimal('delivery_lon', 11, 8).nullable();
      
      // Observações
      table.text('customer_notes').nullable();
      table.text('internal_notes').nullable();
      
      // Valores
      table.decimal('subtotal', 10, 2).defaultTo(0);
      table.decimal('discount', 10, 2).defaultTo(0);
      table.decimal('tax', 10, 2).defaultTo(0);
      table.decimal('shipping', 10, 2).defaultTo(0);
      table.decimal('total', 10, 2).defaultTo(0);
      table.string('currency', 3).defaultTo('BRL');
      
      // Datas
      table.timestamp('order_date').defaultTo(knex.fn.now());
      table.timestamp('estimated_delivery').nullable();
      table.timestamp('actual_delivery').nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('user_id');
      table.index('order_status');
      table.index('order_date');
      table.index('order_number');
      table.index('payment_status');
    });
    
    // Foreign keys
    await knex.schema.table('whatsapp_orders', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
      table.foreign('source_message_id').references('whatsapp_messages.id').onDelete('SET NULL');
    });
    
    console.log('[Migration] Tabela whatsapp_orders criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_orders');
};
