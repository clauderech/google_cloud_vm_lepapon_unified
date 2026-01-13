'use strict';

const fs = require('fs');
const path = require('path');

/**
 * VERSÃO CORRIGIDA: Importa produtos do catálogo CSV para whatsapp_catalog_products
 * Arquivo: files/csvs/catalog_products_2026-01-05.csv
 * 
 * MELHORIAS:
 * - Usa TODAS as colunas do CSV (id, name, type, category, price)
 * - Validação de dados
 * - Detecção de duplicatas
 * - Preços reais do CSV em vez de genéricos
 * - Categorias do CSV em vez de deduzidas
 */

exports.up = async function up(knex) {
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
    
    // Validar header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim());
    console.log('[Migration] Headers encontrados:', headers);
    
    if (headers.length < 5) {
      throw new Error(`Headers inválido. Esperado: id,name,type,category,price. Recebido: ${headers.join(',')}`);
    }
    
    // Parsear dados do CSV
    const records = [];
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Pular linhas vazias
      
      try {
        // Split apenas até 5 colunas (price pode ter espaços)
        const parts = line.split(',');
        
        if (parts.length < 5) {
          console.warn(`[Row ${i}] Linha incompleta, ignorando: ${line.substring(0, 50)}...`);
          skippedCount++;
          continue;
        }
        
        const id = parts[0].trim();
        const name = parts[1].trim();
        const type = parts[2].trim();
        const category = parts[3].trim();
        const price = parseFloat(parts[4].trim());
        
        // Validações
        if (!id) {
          console.warn(`[Row ${i}] ID vazio, ignorando`);
          skippedCount++;
          continue;
        }
        
        if (!name) {
          console.warn(`[Row ${i}] Nome vazio, ignorando ID ${id}`);
          skippedCount++;
          continue;
        }
        
        if (isNaN(price)) {
          console.warn(`[Row ${i}] Preço inválido "${parts[4]}" para ${name}, usando 0`);
          // Continuar mesmo com preço inválido
        }
        
        // Validar preço range
        if (price < 0 || price > 999.99) {
          console.warn(`[Row ${i}] Preço fora do range (${price}): ${name}`);
        }
        
        records.push({
          csv_id: id,
          csv_name: name,
          csv_type: type,
          csv_category: category,
          csv_price: isNaN(price) ? 0 : price
        });
        
      } catch (error) {
        console.error(`[Row ${i}] Erro ao parsear: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`[Migration] Parsing completo: ${records.length} válidos, ${skippedCount} pulados, ${errorCount} erros`);
    
    // Preparar dados para inserção
    const products = records.map((record) => {
      // Normalizar nome (underscores → espaços)
      const normalizedName = record.csv_name.replace(/_/g, ' ');
      
      return {
        product_retailer_id: String(record.csv_id).trim(),
        catalog_id: process.env.WHATSAPP_CATALOG_ID || '857531673917870',
        name: normalizedName,
        description: generateDescription(normalizedName),
        category: normalizeCategory(record.csv_category), // Usar categoria do CSV
        price: record.csv_price > 0 ? record.csv_price : null, // Usar preço real do CSV
        currency: 'BRL',
        is_available: true,
        stock_quantity: 999,
        image_urls: null, // Não disponível no CSV
        meta_data: JSON.stringify({
          source: 'csv_import_v2',
          imported_at: new Date().toISOString(),
          original_name: record.csv_name,
          original_category: record.csv_category,
          original_price: record.csv_price,
          product_type: record.csv_type, // Armazenar type em meta_data
        }),
        last_synced: knex.fn.now(),
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      };
    }).filter(p => p.product_retailer_id && p.name);
    
    // Detecção de duplicatas
    const idSet = new Set();
    const duplicates = [];
    
    products.forEach(p => {
      if (idSet.has(p.product_retailer_id)) {
        duplicates.push(p.product_retailer_id);
      }
      idSet.add(p.product_retailer_id);
    });
    
    if (duplicates.length > 0) {
      console.warn(`[Migration] Duplicatas detectadas (${duplicates.length}):`, duplicates.slice(0, 5));
    }
    
    // Inserir em chunks para melhor performance
    const chunkSize = 20;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      await knex('whatsapp_catalog_products').insert(chunk);
      console.log(`[Migration] Inseridos ${Math.min(i + chunkSize, products.length)}/${products.length} produtos`);
    }
    
    console.log(`[Migration] ✅ ${products.length} produtos importados com sucesso`);
    console.log(`[Migration] Distribuição por categoria:`, getCategoryStats(products));
    
  } catch (error) {
    console.error('[Migration] ❌ Erro ao importar catálogo:', error.message);
    throw error;
  }
};

exports.down = async function down(knex) {
  await knex('whatsapp_catalog_products').delete();
};

/**
 * Gera descrição a partir do nome
 */
function generateDescription(name) {
  if (!name) return 'Descrição não disponível';
  
  // Capitalizar corretamente
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normaliza categoria (padroniza format do CSV)
 * Mantém categoria original, apenas padroniza case
 */
function normalizeCategory(category) {
  if (!category) return 'Outros';
  
  return category
    .toLowerCase()
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gera estatísticas de categorias
 */
function getCategoryStats(products) {
  const stats = {};
  
  products.forEach(p => {
    const cat = p.category || 'Sem Categoria';
    stats[cat] = (stats[cat] || 0) + 1;
  });
  
  return stats;
}
