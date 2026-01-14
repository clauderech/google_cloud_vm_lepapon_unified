'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Migration: Importa produtos do CSV para a tabela products
 * Fonte: files/csvs/catalog_products_2026-01-05.csv
 */

exports.up = async function up(knex) {
  const hasData = await knex('products').count('* as count').first();
  
  if (hasData?.count > 0) {
    console.log('[Migration] Tabela products já possui dados, pulando importação');
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
      if (!line) continue;
      
      try {
        const parts = line.split(',');
        
        if (parts.length < 5) {
          console.warn(`[Row ${i}] Linha incompleta, ignorando`);
          skippedCount++;
          continue;
        }
        
        const id = parts[0].trim();
        const name = parts[1].trim();
        const type = parts[2].trim();
        const category = parts[3].trim();
        const price = parseFloat(parts[4].trim());
        
        if (!id || !name) {
          console.warn(`[Row ${i}] ID ou nome vazio, ignorando`);
          skippedCount++;
          continue;
        }
        
        records.push({
          id,
          name,
          type,
          category,
          price: isNaN(price) ? null : price
        });
        
      } catch (error) {
        console.error(`[Row ${i}] Erro ao parsear: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`[Migration] Parsing completo: ${records.length} válidos, ${skippedCount} pulados, ${errorCount} erros`);
    
    // Preparar dados para inserção na tabela products
    const products = records.map((record) => {
      const normalizedName = record.name.replace(/_/g, ' ');
      const normalizedType = record.type.toLowerCase() === 'insumo' ? 'insumo' : 'prato';
      
      return {
        id: String(record.id).trim(),
        name: normalizedName,
        type: normalizedType,
        category: normalizeCategory(record.category),
        price: record.price > 0 ? record.price : null,
        cost: null,  // Não disponível no CSV
        stock: 999,  // Estoque padrão
        min_stock: 10,
        max_stock: 999,
        unit: 'un',  // Unidade padrão
        supplier_id: null,
        description: generateDescription(normalizedName),
        barcode: null,
        is_active: 1,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now()
      };
    }).filter(p => p.id && p.name);
    
    // Detecção de duplicatas
    const idSet = new Set();
    const duplicates = [];
    
    products.forEach(p => {
      if (idSet.has(p.id)) {
        duplicates.push(p.id);
      }
      idSet.add(p.id);
    });
    
    if (duplicates.length > 0) {
      console.warn(`[Migration] Duplicatas detectadas (${duplicates.length}):`, duplicates.slice(0, 5));
    }
    
    // Inserir em chunks para melhor performance
    const chunkSize = 20;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      await knex('products').insert(chunk);
      console.log(`[Migration] Inseridos ${Math.min(i + chunkSize, products.length)}/${products.length} produtos`);
    }
    
    console.log(`[Migration] ✅ ${products.length} produtos importados com sucesso para tabela products`);
    
  } catch (error) {
    console.error('[Migration] ❌ Erro ao importar catálogo:', error.message);
    throw error;
  }
};

exports.down = async function down(knex) {
  // Não deletar dados na reversão por segurança
  console.log('[Migration] Down: nenhuma ação (produtos não deletados por segurança)');
};

/**
 * Gera descrição a partir do nome
 */
function generateDescription(name) {
  if (!name) return 'Descrição não disponível';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normaliza categoria
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
