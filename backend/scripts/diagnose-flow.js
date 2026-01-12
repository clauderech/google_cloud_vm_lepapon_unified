#!/usr/bin/env node

/**
 * Script de diagnóstico para WhatsApp Flow
 * Verifica se a configuração de criptografia está correta
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(80));
console.log('  DIAGNÓSTICO - WHATSAPP FLOW');
console.log('='.repeat(80) + '\n');

// 1. Verificar variáveis de ambiente
console.log('1️⃣  VARIÁVEIS DE AMBIENTE:');
console.log('-'.repeat(80));

const flowPrivateKeyPath = process.env.WHATSAPP_FLOW_PRIVATE_KEY_PATH;
const appSecret = process.env.WHATSAPP_APP_SECRET;

console.log(`  WHATSAPP_FLOW_PRIVATE_KEY_PATH = ${flowPrivateKeyPath || '❌ NÃO CONFIGURADO'}`);
console.log(`  WHATSAPP_APP_SECRET            = ${appSecret ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);

// 2. Verificar se o arquivo de chave existe
console.log('\n2️⃣  ARQUIVO DE CHAVE PRIVADA:');
console.log('-'.repeat(80));

if (!flowPrivateKeyPath) {
  console.log('  ❌ WHATSAPP_FLOW_PRIVATE_KEY_PATH não está configurado!');
  console.log('     Configure no arquivo .env');
  process.exit(1);
}

// Resolver caminho
let keyPath = flowPrivateKeyPath;
if (!path.isAbsolute(keyPath)) {
  keyPath = path.resolve(__dirname, '..', keyPath);
}

console.log(`  Procurando em: ${keyPath}`);
console.log(`  Caminho absoluto: ${path.isAbsolute(flowPrivateKeyPath) ? 'Sim' : 'Não (será resolvido relativo ao backend/)'}`);

const fileExists = fs.existsSync(keyPath);
console.log(`  Arquivo existe: ${fileExists ? '✅ SIM' : '❌ NÃO'}`);

if (!fileExists) {
  console.log('\n  ⚠️  SOLUÇÃO:');
  console.log(`     1. Coloque o arquivo da chave em: ${keyPath}`);
  console.log('     2. Ou atualize WHATSAPP_FLOW_PRIVATE_KEY_PATH no .env com o caminho correto');
  console.log('     3. Certifique-se que o arquivo tem permissões de leitura (chmod 644)');
  process.exit(1);
}

// 3. Verificar permissões do arquivo
console.log('\n3️⃣  PERMISSÕES DO ARQUIVO:');
console.log('-'.repeat(80));

try {
  const stats = fs.statSync(keyPath);
  const mode = (stats.mode & parseInt('777', 8)).toString(8);
  
  console.log(`  Tamanho: ${stats.size} bytes`);
  console.log(`  Permissões: ${mode}`);
  
  // Verificar se arquivo é legível
  try {
    fs.accessSync(keyPath, fs.constants.R_OK);
    console.log('  Leitura: ✅ PERMITIDA');
  } catch {
    console.log('  Leitura: ❌ NÃO PERMITIDA');
    console.log('     Execute: chmod 644 ' + keyPath);
    process.exit(1);
  }
  
} catch (error) {
  console.log(`  ❌ Erro ao verificar arquivo: ${error.message}`);
  process.exit(1);
}

// 4. Verificar formato da chave
console.log('\n4️⃣  FORMATO DA CHAVE:');
console.log('-'.repeat(80));

try {
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  
  if (keyContent.includes('BEGIN RSA PRIVATE KEY') || keyContent.includes('BEGIN PRIVATE KEY')) {
    console.log('  ✅ Formato válido de chave privada RSA');
  } else {
    console.log('  ❌ Formato não reconhecido como chave privada RSA');
    console.log('     Certifique-se que o arquivo contém uma chave privada RSA válida');
    process.exit(1);
  }
  
  const lines = keyContent.split('\n').length;
  console.log(`  Linhas: ${lines}`);
  console.log(`  Primeiras 100 caracteres: ${keyContent.substring(0, 100)}...`);
  
} catch (error) {
  console.log(`  ❌ Erro ao ler arquivo: ${error.message}`);
  process.exit(1);
}

// 5. Resumo final
console.log('\n' + '='.repeat(80));
console.log('  ✅ RESUMO - TUDO OK');
console.log('='.repeat(80) + '\n');

console.log('  ✅ Variáveis de ambiente configuradas');
console.log('  ✅ Arquivo de chave encontrado');
console.log('  ✅ Permissões corretas');
console.log('  ✅ Formato de chave válido');
console.log('\n  A aplicação pode processar WhatsApp Flows normalmente!\n');

process.exit(0);
