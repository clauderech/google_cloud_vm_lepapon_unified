/**
 * Adiciona tipo de movimentação 'production' para produção de insumos caseiros
 * Data: 2 de abril de 2026
 */

exports.up = async function(knex) {
  const movementTypes = [
    'sale',
    'purchase',
    'adjustment',
    'comanda_add',
    'comanda_cancel',
    'recipe_usage',
    'recipe_revert',
    'production',
    'production_ingredient'
  ];

  const referenceTypes = [
    'sale',
    'purchase',
    'comanda',
    'manual_adjustment',
    'production'
  ];

  // Normalizar dados legados para evitar erro de truncamento no ALTER TABLE.
  await knex.raw(`
    UPDATE stock_movements
    SET movement_type = 'adjustment'
    WHERE movement_type IS NULL
      OR movement_type = ''
      OR movement_type NOT IN (${movementTypes.map(() => '?').join(', ')})
  `, movementTypes);

  await knex.raw(`
    UPDATE stock_movements
    SET reference_type = 'manual_adjustment'
    WHERE reference_type IS NULL
      OR reference_type = ''
      OR reference_type NOT IN (${referenceTypes.map(() => '?').join(', ')})
  `, referenceTypes);

  // Adicionar 'production' no ENUM movement_type
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN movement_type 
    ENUM('sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage', 'recipe_revert', 'production', 'production_ingredient')
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
  const downMovementTypes = [
    'sale',
    'purchase',
    'adjustment',
    'comanda_add',
    'comanda_cancel',
    'recipe_usage',
    'recipe_revert'
  ];

  // Garantir que valores não suportados pelo down sejam normalizados antes do ALTER.
  await knex.raw(`
    UPDATE stock_movements
    SET movement_type = 'adjustment'
    WHERE movement_type IS NULL
      OR movement_type = ''
      OR movement_type NOT IN (${downMovementTypes.map(() => '?').join(', ')})
  `, downMovementTypes);

  await knex.raw(`
    UPDATE stock_movements
    SET reference_type = 'manual_adjustment'
    WHERE reference_type IS NULL
      OR reference_type = ''
      OR reference_type NOT IN ('sale', 'purchase', 'comanda', 'manual_adjustment')
  `);

  // Remover 'production' dos ENUMs
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN movement_type 
    ENUM('sale', 'purchase', 'adjustment', 'comanda_add', 'comanda_cancel', 'recipe_usage', 'recipe_revert')
  `);
  
  await knex.raw(`
    ALTER TABLE stock_movements 
    MODIFY COLUMN reference_type 
    ENUM('sale', 'purchase', 'comanda', 'manual_adjustment')
  `);
  
  console.log('Tipos de movimentação "production" removidos');
};