/**
 * Migration: Change insumo products to revenda type
 * Date: 2026-01-14
 * Description: Altera todos os produtos com type='insumo' para type='revenda'
 */

exports.up = async function(knex) {
  try {
    const updatedCount = await knex('products')
      .where('type', 'insumo')
      .update({
        type: 'revenda',
        updated_at: new Date()
      });
    
    console.log(`✅ ${updatedCount} produtos alterados de 'insumo' para 'revenda'`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar produtos:', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  try {
    const updatedCount = await knex('products')
      .where('type', 'revenda')
      .update({
        type: 'insumo',
        updated_at: new Date()
      });
    
    console.log(`✅ Revertido: ${updatedCount} produtos alterados de 'revenda' para 'insumo'`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao reverter produtos:', error.message);
    throw error;
  }
};
