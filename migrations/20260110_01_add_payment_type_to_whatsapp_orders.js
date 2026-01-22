'use strict';

/**
 * Adiciona coluna payment_type à tabela whatsapp_orders
 */

exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_orders', 'payment_type');
  
  if (!hasColumn) {
    await knex.schema.table('whatsapp_orders', (table) => {
      table.enum('payment_type', [
        'dinheiro',
        'cartao_credito',
        'cartao_debito',
        'pix',
        'transferencia',
        'outros'
      ]).nullable();
      
      table.index('payment_type');
    });
    
    console.log('[Migration] Coluna payment_type adicionada à tabela whatsapp_orders');
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_orders', 'payment_type');
  
  if (hasColumn) {
    await knex.schema.table('whatsapp_orders', (table) => {
      table.dropColumn('payment_type');
    });
  }
};
