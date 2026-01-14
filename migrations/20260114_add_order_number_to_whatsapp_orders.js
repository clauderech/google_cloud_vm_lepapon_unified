/**
 * Migration: Add order_number column to whatsapp_orders
 * Date: 2026-01-14
 * Description: Adiciona coluna order_number que estava faltando
 */

exports.up = async function(knex) {
  try {
    const hasColumn = await knex.schema.hasColumn('whatsapp_orders', 'order_number');
    
    if (!hasColumn) {
      await knex.schema.table('whatsapp_orders', (table) => {
        table.string('order_number', 50).unique().nullable();
        table.index('order_number');
      });
      console.log('✅ Coluna order_number adicionada à tabela whatsapp_orders');
    } else {
      console.log('⚠️ Coluna order_number já existe');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar order_number:', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  try {
    const hasColumn = await knex.schema.hasColumn('whatsapp_orders', 'order_number');
    
    if (hasColumn) {
      await knex.schema.table('whatsapp_orders', (table) => {
        table.dropColumn('order_number');
      });
      console.log('✅ Coluna order_number removida');
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao remover order_number:', error.message);
    throw error;
  }
};
