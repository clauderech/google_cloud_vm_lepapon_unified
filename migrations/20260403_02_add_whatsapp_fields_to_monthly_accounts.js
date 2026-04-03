/**
 * Adiciona campos de controle WhatsApp na tabela monthly_accounts
 * Data: 3 de abril de 2026
 */

export async function up(knex) {
  const hasMonthlyAccounts = await knex.schema.hasTable('monthly_accounts');
  if (hasMonthlyAccounts) {
    const hasLastSentAt = await knex.schema.hasColumn('monthly_accounts', 'last_sent_at');
    if (!hasLastSentAt) {
      await knex.schema.alterTable('monthly_accounts', (table) => {
        table.timestamp('last_sent_at').nullable(); // Última vez que foi enviada via WhatsApp
        table.integer('receipt_count').defaultTo(0); // Quantas vezes foi enviada
        table.enum('status_whatsapp', ['never_sent', 'sent', 'delivered', 'read', 'failed']).defaultTo('never_sent');
        
        table.index(['last_sent_at']); // Para busca de lembretes
        table.index(['status_whatsapp']); // Para filtros
      });
    }
  }
}

export async function down(knex) {
  const hasMonthlyAccounts = await knex.schema.hasTable('monthly_accounts');
  if (hasMonthlyAccounts) {
    const hasLastSentAt = await knex.schema.hasColumn('monthly_accounts', 'last_sent_at');
    if (hasLastSentAt) {
      await knex.schema.alterTable('monthly_accounts', (table) => {
        table.dropColumn('last_sent_at');
        table.dropColumn('receipt_count');
        table.dropColumn('status_whatsapp');
      });
    }
  }
}