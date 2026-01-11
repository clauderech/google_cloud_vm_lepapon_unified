'use strict';

/**
 * Cria tabela de agregações analíticas para ML e relatórios
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_analytics');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_analytics', (table) => {
      table.bigIncrements('id').primary();
      table.bigInteger('user_id').unsigned().nullable();
      
      // RFM Metrics
      table.integer('recency_days').nullable();
      table.integer('frequency_purchases').nullable();
      table.decimal('monetary_value', 10, 2).nullable();
      table.string('rfm_score', 10).nullable();
      
      // Comportamento
      table.decimal('avg_order_value', 10, 2).nullable();
      table.json('preferred_categories').nullable();
      table.json('preferred_items').nullable();
      
      // Engagement
      table.decimal('message_response_rate', 5, 2).nullable();
      table.decimal('flow_completion_rate', 5, 2).nullable();
      
      // Churn
      table.integer('days_since_activity').nullable();
      table.decimal('churn_risk_score', 5, 2).nullable();
      
      // Período
      table.date('period_start').nullable();
      table.date('period_end').nullable();
      
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('user_id');
      table.index('rfm_score');
      table.index('churn_risk_score');
    });
    
    // Foreign key
    await knex.schema.table('whatsapp_analytics', (table) => {
      table.foreign('user_id').references('whatsapp_users.id').onDelete('CASCADE');
    });
    
    console.log('[Migration] Tabela whatsapp_analytics criada');
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_analytics');
};
