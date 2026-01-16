'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Importa insumos do CSV para a tabela products
 * Arquivo: files/csvs/insumos.csv
 * 
 * Mapeamento de colunas:
 * - name → name (obrigatório)
 * - type → type (padrão: 'insumo')
 * - price → price (vazio → 0.00)
 * - cost → cost (vazio → 0.00)
 * - stock → stock (vazio → 0.000)
 * - min_stock → min_stock (vazio → 10.000)
 * - max_stock → max_stock (pode ser NULL)
 * - unit → unit (pode ser NULL)
 * - supplier_id → supplier_id (pode ser NULL)
 * - category → category (padrão: 'Geral')
 * - description → description (pode ser NULL)
 * - barcode → barcode (pode ser NULL)
 * - is_active → is_active (padrão: 1)
 */

exports.up = async function up(knex) {
  try {
    // Ler arquivo CSV
    const csvPath = path.resolve(__dirname, '../files/csvs/insumos.csv');
    
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
    
    // Mapear índices das colunas
    const columnMap = {};
    headers.forEach((header, index) => {
      columnMap[header] = index;
    });
    
    // Verificar colunas obrigatórias
    if (columnMap['name'] === undefined) {
      throw new Error('Coluna "name" não encontrada no CSV');
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
        
        // Extrair valores de acordo com o mapeamento
        const name = (parts[columnMap['name']] || '').trim();
        const type = (parts[columnMap['type']] || 'insumo').trim();
        const price = parseFloat(parts[columnMap['price']] || '0') || 0;
        const cost = parseFloat(parts[columnMap['cost']] || '0') || 0;
        const stock = parseFloat(parts[columnMap['stock']] || '0') || 0;
        const min_stock = parseFloat(parts[columnMap['min_stock']] || '10') || 10;
        const max_stock = parts[columnMap['max_stock']] ? parseFloat(parts[columnMap['max_stock']]) : null;
        const unit = (parts[columnMap['unit']] || '').trim() || null;
        const supplier_id = (parts[columnMap['supplier_id']] || '').trim() || null;
        const category = (parts[columnMap['category']] || 'Geral').trim() || 'Geral';
        const description = (parts[columnMap['description']] || '').trim() || null;
        const barcode = (parts[columnMap['barcode']] || '').trim() || null;
        const is_active = (parts[columnMap['is_active']] || '1').trim() === '0' ? 0 : 1;
        
        // Validação obrigatória: name
        if (!name) {
          console.warn(`[Row ${i}] Nome vazio, ignorando`);
          skippedCount++;
          continue;
        }
        
        // Gerar ID a partir do nome normalizado se não existir
        const id = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
        
        records.push({
          id,
          name: name.replace(/_/g, ' '), // Converter underscores em espaços
          type,
          price: price > 0 ? price : 0,
          cost: cost > 0 ? cost : 0,
          stock,
          min_stock,
          max_stock,
          unit: unit && unit !== '' ? unit : null,
          supplier_id: supplier_id && supplier_id !== '' ? supplier_id : null,
          category,
          description: description && description !== '' ? description : null,
          barcode: barcode && barcode !== '' ? barcode : null,
          is_active
        });
        
      } catch (error) {
        console.error(`[Row ${i}] Erro ao parsear: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`[Migration] Parsing completo: ${records.length} válidos, ${skippedCount} pulados, ${errorCount} erros`);
    
    if (records.length === 0) {
      console.warn('[Migration] Nenhum registro válido encontrado no CSV');
      return;
    }
    
    // Inserir em chunks para melhor performance
    const chunkSize = 20;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await knex('products').insert(chunk);
      console.log(`[Migration] Inseridos ${Math.min(i + chunkSize, records.length)}/${records.length} insumos`);
    }
    
    console.log(`[Migration] ✅ ${records.length} insumos importados com sucesso`);
    
  } catch (error) {
    console.error('[Migration] ❌ Erro ao importar insumos:', error.message);
    throw error;
  }
};

exports.down = async function down(knex) {
  // Esta migration apenas insere dados, então no down não fazemos delete
  // para não perder dados acidentalmente. Descomente se quiser sempre limpar:
  // await knex('products').delete();
  console.log('[Migration] Down: migration apenas insere dados, nenhuma ação necessária');
};
