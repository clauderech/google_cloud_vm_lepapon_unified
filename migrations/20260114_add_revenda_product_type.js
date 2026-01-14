/**
 * Migration: Add 'revenda' type to products table
 * Date: 2026-01-14
 * Description: Adiciona 'revenda' como novo tipo de produto além de 'insumo' e 'prato'
 */

exports.up = async function(knex) {
  try {
    // Modificar coluna type para adicionar 'revenda' ao ENUM
    await knex.raw(`
      ALTER TABLE products 
      MODIFY COLUMN type ENUM('insumo', 'prato', 'revenda') NOT NULL
    `);
    
    console.log('✅ Tipo "revenda" adicionado à tabela products');
    return true;
  } catch (error) {
    console.error('❌ Erro ao adicionar tipo "revenda":', error.message);
    throw error;
  }
};

exports.down = async function(knex) {
  try {
    // Reverter para os tipos originais
    await knex.raw(`
      ALTER TABLE products 
      MODIFY COLUMN type ENUM('insumo', 'prato') NOT NULL
    `);
    
    console.log('✅ Revertido: tipo "revenda" removido');
    return true;
  } catch (error) {
    console.error('❌ Erro ao reverter tipo "revenda":', error.message);
    throw error;
  }
};
