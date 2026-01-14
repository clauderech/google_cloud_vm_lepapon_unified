'use strict';

/**
 * Cria tabela de itens de pedidos
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_order_items');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_order_items', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('order_id').unsigned().notNullable();
      
      // Produto
      table.string('product_retailer_id', 100);
      table.string('product_name', 255);
      table.text('product_description').nullable();
      table.text('product_image_url').nullable();
      
      // Quantidade e Preço
      table.integer('quantity').notNullable();
      table.decimal('unit_price', 10, 2);
      table.decimal('total_price', 10, 2);
      
      // Customizações
      table.json('customizations').nullable();
      table.text('special_instructions').nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('order_id');
      table.index('product_retailer_id');
    });
    
    // Foreign key
    await knex.schema.table('whatsapp_order_items', (table) => {
      table.foreign('order_id').references('whatsapp_orders.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_order_items criada');
  }
};

exports.down = async function down(knex) {
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await knex.schema.dropTableIfExists('whatsapp_order_items');
  } finally {
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
  }
};
