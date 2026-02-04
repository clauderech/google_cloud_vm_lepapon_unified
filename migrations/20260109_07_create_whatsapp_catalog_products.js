

/**
 * Cria tabela de produtos do catálogo (cache local)
 */

export async function up(knex) {
  const hasTable = await knex.schema.hasTable('whatsapp_catalog_products');
  
  if (!hasTable) {
    await knex.schema.createTable('whatsapp_catalog_products', (table) => {
      table.bigIncrements('id').primary();
      
      // Identificadores
      table.string('product_retailer_id', 100).unique().notNullable();
      table.string('catalog_id', 100).nullable();
      
      // Dados do Produto
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.string('category', 100).nullable();
      
      // Preço e Disponibilidade
      table.decimal('price', 10, 2);
      table.string('currency', 3).defaultTo('BRL');
      table.boolean('is_available').defaultTo(true);
      table.integer('stock_quantity').defaultTo(0);
      
      // Mídia
      table.json('image_urls').nullable();
      
      // Metadata
      table.json('meta_data').nullable();
      table.timestamp('last_synced').nullable();
      
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
      
      // Índices
      table.index('product_retailer_id');
      table.index('catalog_id');
      table.index('category');
      table.index('is_available');
    });
    
    console.log('[Migration] Tabela whatsapp_catalog_products criada');
  }
};

export async function down(knex) {
  await knex.schema.dropTableIfExists('whatsapp_catalog_products');
}
