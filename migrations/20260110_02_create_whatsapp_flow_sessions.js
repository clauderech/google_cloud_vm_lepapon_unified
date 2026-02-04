

/**
 * Cria tabela para rastrear sessões de Flow
 * Mapeia flow_token (identificador da sessão) com user_id e order_id
 */

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_flow_sessions');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_flow_sessions', (table) => {
      table.increments('id').primary();
      
      // Identificadores de Flow
      table.string('flow_token', 255).unique().notNullable();
      table.string('flow_session_id', 100).nullable();
      
      // Relacionamentos
      table.bigInteger('user_id').unsigned().notNullable();
      table.bigInteger('order_id').unsigned().nullable();
      
      // Status
      table.enum('flow_status', [
        'initiated',      // Flow iniciado
        'in_progress',    // Usuário interagindo
        'completed',      // Flow concluído
        'abandoned',      // Usuário abandonou
        'expired'         // Sessão expirou
      ]).defaultTo('initiated');
      
      // Dados coletados do flow (JSON)
      table.json('collected_data').nullable();
      
      // Rastreamento
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('last_interaction_at').nullable();
      table.timestamp('completed_at').nullable();
      
      // Índices
      table.index('user_id');
      table.index('order_id');
      table.index('flow_status');
      table.index('created_at');
    });
    
    // Foreign keys
    await knex.schema.table('whatsapp_flow_sessions', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
      table.foreign('order_id').references('whatsapp_orders.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_flow_sessions criada');
  }
};

export async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_flow_sessions');
}
