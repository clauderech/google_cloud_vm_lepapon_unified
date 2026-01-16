/**
 * Migration: Import customers from CSV
 * Date: 2026-01-16
 */

const fs = require('fs');
const path = require('path');

exports.up = async function(knex) {
  console.log('[Migration] Iniciando importação de clientes do CSV...');
  
  const csvPath = path.join(__dirname, '../files/csvs/customers.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('[Migration] Arquivo CSV não encontrado:', csvPath);
    throw new Error('Arquivo customers.csv não encontrado');
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Pular header
  const dataLines = lines.slice(1);
  
  console.log(`[Migration] Total de clientes a importar: ${dataLines.length}`);
  
  let importedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  
  for (const line of dataLines) {
    try {
      // Parse CSV line (considerando valores entre aspas)
      const match = line.match(/^(\d+),(.*?),(.*?),(.*?)$/);
      
      if (!match) {
        console.warn('[Migration] Linha inválida:', line);
        errorCount++;
        continue;
      }
      
      const [, id, nome, sobrenome, fone] = match;
      
      if (!id || !nome) {
        console.warn('[Migration] Dados incompletos:', { id, nome });
        errorCount++;
        continue;
      }
      
      // Verificar se cliente já existe
      const existing = await knex('customers').where('id', id).first();
      
      const customerData = {
        id: id.trim(),
        nome: nome.trim(),
        sobrenome: sobrenome ? sobrenome.trim() : null,
        fone: fone ? fone.trim() : null,
        loyalty_points: 0
      };
      
      if (existing) {
        // Atualizar apenas se houver mudanças
        await knex('customers')
          .where('id', id)
          .update({
            nome: customerData.nome,
            sobrenome: customerData.sobrenome,
            fone: customerData.fone,
            updated_at: knex.fn.now()
          });
        updatedCount++;
      } else {
        // Inserir novo cliente
        await knex('customers').insert(customerData);
        importedCount++;
      }
      
    } catch (error) {
      console.error('[Migration] Erro ao processar linha:', line, error.message);
      errorCount++;
    }
  }
  
  console.log('[Migration] Importação concluída:');
  console.log(`  - Novos clientes: ${importedCount}`);
  console.log(`  - Clientes atualizados: ${updatedCount}`);
  console.log(`  - Erros: ${errorCount}`);
};

exports.down = async function(knex) {
  // Não remover clientes na reversão, pois pode haver vendas associadas
  console.log('[Migration] Reversão: Mantendo clientes importados');
};
