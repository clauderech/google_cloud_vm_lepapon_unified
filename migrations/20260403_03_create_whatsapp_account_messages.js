/**
 * Cria tabela para histórico de mensagens de contas enviadas via WhatsApp
 * Data: 3 de abril de 2026
 */

export async function up(knex) {
  const hasWhatsappAccountMessages = await knex.schema.hasTable('whatsapp_account_messages');
  if (!hasWhatsappAccountMessages) {
    await knex.schema.createTable('whatsapp_account_messages', (table) => {
      table.increments('id').primary();
      
      table.integer('monthly_account_id').notNullable();
      table.string('customer_id', 255).notNullable();
      table.string('whatsapp_phone', 20).notNullable(); // +55119XXXXXXXXX
      
      table.enum('message_type', ['account_receipt', 'reminder', 'response', 'resend']).notNullable();
      table.text('message_content').nullable(); // Texto da mensagem enviada
      table.string('media_url').nullable(); // URL da imagem da conta (se aplicável)
      
      table.enum('send_status', ['pending', 'sent', 'delivered', 'read', 'failed']).defaultTo('pending');
      table.string('whatsapp_message_id').nullable(); // ID da mensagem no WhatsApp
      table.text('error_details').nullable(); // Detalhes do erro se falhou
      
      table.timestamp('sent_at').nullable();
      table.timestamp('delivered_at').nullable();
      table.timestamp('read_at').nullable();
      table.timestamp('failed_at').nullable();
      
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
      
      // Índices para performance
      table.index(['monthly_account_id']);
      table.index(['customer_id']);
      table.index(['whatsapp_phone']);
      table.index(['message_type']);
      table.index(['send_status']);
      table.index(['sent_at']);
      
      // Foreign key (se customers existir)
      table.foreign('monthly_account_id').references('id').inTable('monthly_accounts').onDelete('CASCADE');
    });
  }
}

export async function down(knex) {
  await knex.schema.dropTable('whatsapp_account_messages');
}