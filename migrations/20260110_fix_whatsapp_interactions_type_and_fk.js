'use strict';

/**
 * Corrige tipo de dado e foreign key em whatsapp_interactions
 * 
 * Mudanças:
 * - Altera user_id de INTEGER para BIGINT UNSIGNED para alinhamento com whatsapp_users.id
 * - Recria foreign key com tipo correto
 * - Garante referencial integrity com CASCADE delete
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_interactions');
  
  if (hasTable) {
    console.log('[Migration] Corrigindo tipo de user_id em whatsapp_interactions (int → bigint unsigned)');
    
    try {
      // Usar SQL raw para ALTER TABLE (Knex não suporta .change() diretamente)
      await knex.raw('ALTER TABLE whatsapp_interactions MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL');
      console.log('[Migration] ✅ Coluna user_id corrigida para BIGINT UNSIGNED');
      
      // Adicionar foreign key após alteração de tipo
      const hasForeignKey = await knex.raw(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'whatsapp_interactions' 
        AND COLUMN_NAME = 'user_id' 
        AND CONSTRAINT_NAME LIKE '%foreign%'
      `);
      
      if (hasForeignKey && hasForeignKey[0] && hasForeignKey[0].length === 0) {
        await knex.raw(`
          ALTER TABLE whatsapp_interactions 
          ADD CONSTRAINT whatsapp_interactions_user_id_foreign 
          FOREIGN KEY (user_id) REFERENCES whatsapp_users(id) 
          ON DELETE CASCADE
        `);
        console.log('[Migration] ✅ Foreign key criada para whatsapp_interactions.user_id');
      } else {
        console.log('[Migration] ℹ️ Foreign key já existe ou verificação retornou resultados ambíguos');
      }
    } catch (error) {
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
      // Remover foreign key antes de alterar tipo
      await knex.raw(`
        ALTER TABLE whatsapp_interactions 
        DROP FOREIGN KEY whatsapp_interactions_user_id_foreign
      `).catch(() => {
        // FK pode não existir, ignorar erro
        console.log('[Migration] ℹ️ Foreign key não encontrada (OK)');
      });
      
      // Reverter para int
      await knex.raw('ALTER TABLE whatsapp_interactions MODIFY COLUMN user_id INT NOT NULL');
      console.log('[Migration] ✅ user_id revertido para INTEGER');
    } catch (error) {
      console.error('[Migration] ❌ Erro ao reverter whatsapp_interactions:', error.message);
      throw error;
    }
  }
};
