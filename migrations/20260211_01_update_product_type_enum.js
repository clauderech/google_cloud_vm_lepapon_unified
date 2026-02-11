/**
 * Atualiza enum de tipo de produto para incluir todos os tipos válidos
 */

export async function up(knex) {
  // Alterar o enum para incluir todos os tipos necessários
  await knex.schema.raw(`
    ALTER TABLE products 
    MODIFY COLUMN type ENUM('insumo', 'insumo_bebida', 'prato', 'drink', 'revenda') NOT NULL
  `);
  
  console.log('[Migration] Enum de tipo de produto atualizado com sucesso');
}

export async function down(knex) {
  // Reverter para o enum anterior (apenas se não houver dados com novos tipos)
  await knex.schema.raw(`
    ALTER TABLE products 
    MODIFY COLUMN type ENUM('insumo', 'prato', 'revenda') NOT NULL
  `);
  
  console.log('[Migration] Enum de tipo de produto revertido');
}