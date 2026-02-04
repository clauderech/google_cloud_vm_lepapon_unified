'use strict';

import fs from 'fs';
import path from 'path';

/**
 * Importa produtos do catálogo CSV para whatsapp_catalog_products
 * Arquivo: files/csvs/catalog_products_2026-01-05.csv
 */

exports.up = async function up(knex) {
export async function up(knex) {
  const hasData = await knex('whatsapp_catalog_products').count('* as count').first();
  
  if (hasData?.count > 0) {
    console.log('[Migration] Catálogo já possui dados, pulando importação');
    return;
  }
  
  try {
    // Ler arquivo CSV
    const csvPath = path.resolve(__dirname, '../files/csvs/catalog_products_2026-01-05.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.warn('[Migration] Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    // Pular header (id,name)
    const records = lines.slice(1).map(line => {
      const [id, ...nameParts] = line.split(',');
      return {
        id: id.trim(),
        name: nameParts.join(',').trim(), // Alguns nomes podem ter vírgula
      };
    });
    
    console.log(`[Migration] Lendo ${records.length} produtos do CSV`);
    
    // Preparar dados para inserção
    const products = records.map(record => ({
      product_retailer_id: String(record.id).trim(),
      catalog_id: process.env.WHATSAPP_CATALOG_ID || '857531673917870',
      name: record.name || 'Produto sem nome',
      category: extractCategory(record.name),
      description: generateDescription(record.name),
      price: generatePrice(record.name),
      currency: 'BRL',
      is_available: true,
      stock_quantity: 999,
      meta_data: JSON.stringify({
        source: 'csv_import',
        imported_at: new Date().toISOString(),
        original_name: record.name,
      }),
      last_synced: knex.fn.now(),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })).filter(p => p.product_retailer_id && p.name);
    
    // Inserir em chunks para melhor performance
    const chunkSize = 20;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      await knex('whatsapp_catalog_products').insert(chunk);
    }
    
    console.log(`[Migration] ${products.length} produtos importados com sucesso`);
  } catch (error) {
    console.error('[Migration] Erro ao importar catálogo:', error.message);
    throw error;
  }
};

exports.down = async function down(knex) {
export async function down(knex) {
  await knex('whatsapp_catalog_products').delete();
};

/**
 * Extrai categoria baseado no nome do produto
 */
function extractCategory(name) {
  if (!name) return 'Outros';
  
  const nameUpper = name.toUpperCase();
  
  if (nameUpper.includes('PIZZA')) return 'Pizza';
  if (nameUpper.includes('XIS')) return 'Xis';
  if (nameUpper.includes('CACHORRO')) return 'Cachorro Quente';
  if (nameUpper.includes('TORRADA')) return 'Torrada';
  if (nameUpper.includes('PASTEL')) return 'Pastel';
  if (nameUpper.includes('SANDUICHE')) return 'Sanduiche';
  if (nameUpper.includes('PICADO')) return 'Picado';
  if (nameUpper.includes('PORCAO')) return 'Porção';
  if (nameUpper.includes('ENROLADINHO')) return 'Enroladinho';
  
  return 'Outros';
}

/**
 * Gera descrição baseado no nome
 */
function generateDescription(name) {
  if (!name) return 'Descrição não disponível';
  
  // Substituir underscore por espaço e capitalizar
  return name
    .replace(/_/g, ' ')
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Gera preço padrão baseado na categoria
 * (Em produção, isso viria de uma tabela de preços)
 */
function generatePrice(name) {
  if (!name) return 25.00;
  
  const nameUpper = name.toUpperCase();
  
  // Pizzas: R$ 40-60
  if (nameUpper.includes('PIZZA')) return 45.00;
  
  // Xis: R$ 20-35
  if (nameUpper.includes('XIS')) return 28.00;
  
  // Cachorro: R$ 12-25
  if (nameUpper.includes('CACHORRO')) return 18.00;
  
  // Torrada: R$ 15-30
  if (nameUpper.includes('TORRADA')) return 22.00;
  
  // Pastel: R$ 10-20
  if (nameUpper.includes('PASTEL')) return 15.00;
  
  // Porções: R$ 20-40
  if (nameUpper.includes('PORCAO')) return 25.00;
  
  return 25.00;
}
