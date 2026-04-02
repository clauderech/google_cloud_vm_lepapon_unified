/**
 * Adiciona tipo de movimentação 'production' para produção de insumos caseiros
 * Data: 2 de abril de 2026
 */

exports.up = async function(knex) {
  // Adicionar 'production' no ENUM movement_type
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN movement_type 
    ENUM('sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage', 'production', 'production_ingredient')
  `);
  
  // Adicionar 'production' no ENUM reference_type
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN reference_type 
    ENUM('sale', 'purchase', 'comanda', 'manual_adjustment', 'production')
  `);
  
  console.log('Tipos de movimentação "production" e "production_ingredient" adicionados com sucesso');
};

exports.down = async function(knex) {
  // Remover 'production' dos ENUMs
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN movement_type 
    ENUM('sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage')
  `);
  
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN reference_type 
    ENUM('sale', 'purchase', 'comanda', 'manual_adjustment')
  `);
  
  console.log('Tipos de movimentação "production" removidos');
};