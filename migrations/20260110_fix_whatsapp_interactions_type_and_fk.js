'use strict';

/**
 * Corrige tipo de dado e foreign key em whatsapp_interactions
 * 
 * Mudanças:
 * - Altera user_id de INTEGER para VARCHAR(255) para alinhamento com whatsapp_users.id
 * - Recria foreign key com tipo correto
 * - Garante referencial integrity com SET NULL
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_interactions');
  
  if (hasTable) {
    console.log('[Migration] Corrigindo tipo de user_id em whatsapp_interactions');
    
    try {
      // Desabilitar constraints temporariamente
      await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
      
      // Droppar foreign key existente se houver
      await knex.raw(`
        ALTER TABLE whatsapp_interactions 
        DROP FOREIGN KEY whatsapp_interactions_user_id_foreign
      `).catch(() => {
        console.log('[Migration] ℹ️ Foreign key não existia (OK)');
      });
      
      // Alterar coluna de INT para VARCHAR(255)
      await knex.raw('ALTER TABLE whatsapp_interactions MODIFY COLUMN user_id VARCHAR(255)');
      console.log('[Migration] ✅ Coluna user_id alterada para VARCHAR(255)');
      
      // Recriar foreign key com tipo correto
      await knex.raw(`
        ALTER TABLE whatsapp_interactions 
        ADD CONSTRAINT whatsapp_interactions_user_id_foreign 
        FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) 
        ON DELETE SET NULL
      `);
      console.log('[Migration] ✅ Foreign key criada para whatsapp_interactions.user_id');
      
      // Reabilitar constraints
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
      
    } catch (error) {
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
      console.error('[Migration] ❌ Erro ao corrigir whatsapp_interactions:', error.message);
      throw error;
    }
  }
};

exports.down = async function down(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_interactions');
  
  if (hasTable) {
    console.log('[Migration] Revertendo alterações em whatsapp_interactions');
    
    try {
      await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
      
      // Remover foreign key
      await knex.raw(`
        ALTER TABLE whatsapp_interactions 
        DROP FOREIGN KEY whatsapp_interactions_user_id_foreign
      `).catch(() => {
        console.log('[Migration] ℹ️ Foreign key não encontrada (OK)');
      });
      
      // Reverter para INT
      await knex.raw('ALTER TABLE whatsapp_interactions MODIFY COLUMN user_id INT');
      console.log('[Migration] ✅ user_id revertido para INTEGER');
      
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
    } catch (error) {
      await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
      console.error('[Migration] ❌ Erro ao reverter whatsapp_interactions:', error.message);
      throw error;
    }
  }
};
