

/**
 * Remove campos redundantes/desnecessários de whatsapp_order_items
 * 
 * Campos removidos:
 * - product_name: Redundante (pode ser consultado em catálogo ou produto master)
 * - product_description: Redundante (pode ser consultado em catálogo)
 * - product_image_url: Desnecessário (não usado em processamento)
 * - customizations: Não suportado pelo fluxo atual
 * - special_instructions: Capturado no campo observações do flow
 * 
 * Campos mantidos:
 * - id: PK
 * - order_id: FK para o pedido
 * - product_retailer_id: ID único do produto
 * - quantity: Quantidade do item
 * - unit_price: Preço unitário
 * - total_price: Preço total
 * - created_at, updated_at: Timestamps
 */

export async function up(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_order_items', 'product_name');
  
  if (hasColumn) {
    console.log('[Migration] Removendo campos redundantes de whatsapp_order_items');
    await knex.schema.table('whatsapp_order_items', (table) => {
      table.dropColumn('product_name');
      table.dropColumn('product_description');
      table.dropColumn('product_image_url');
      table.dropColumn('customizations');
      table.dropColumn('special_instructions');
    });
  }
};

export async function down(knex) {
  const hasColumn = await knex.schema.hasColumn('whatsapp_order_items', 'product_name');
  
  if (!hasColumn) {
    console.log('[Migration] Readicionando campos removidos em whatsapp_order_items');
    await knex.schema.table('whatsapp_order_items', (table) => {
      table.string('product_name', 255).after('product_retailer_id').nullable();
      table.text('product_description').after('product_name').nullable();
      table.text('product_image_url').after('product_description').nullable();
      table.json('customizations').after('total_price').nullable();
      table.text('special_instructions').after('customizations').nullable();
    });
  }
};
