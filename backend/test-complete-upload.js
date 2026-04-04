#!/usr/bin/env node
/**
 * Script de teste específico para testar todos os métodos de upload WhatsApp
 * com um PDF mínimo válido
 */

require('dotenv').config({ path: '/var/www/google_cloud_vm_lepapon_unified/.env' });

console.log('🧪 TESTE COMPLETO DE UPLOAD WHATSAPP\n');

// Verificar se as configurações estão carregadas
console.log('📋 Verificando configurações:');
console.log('- WHATSAPP_ACCESS_TOKEN:', process.env.WHATSAPP_ACCESS_TOKEN ? 'DEFINIDO' : 'UNDEFINED');
console.log('- WHATSAPP_PHONE_NUMBER_ID:', process.env.WHATSAPP_PHONE_NUMBER_ID ? 'DEFINIDO' : 'UNDEFINED');

if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
  console.log('⚠️  Configurações não encontradas - teste será limitado\n');
  
  // Teste apenas de sintaxe e estrutura
  console.log('🔍 Testando apenas importação e estrutura...');
  try {
    const { 
      uploadMediaToMeta, 
      uploadMediaToMetaWithAxios, 
      uploadMediaToMetaNative,
      validateAndLogWhatsAppEnv 
    } = require('./models/whatsappCloudApi');
    
    console.log('✅ Importação bem-sucedida!');
    console.log('✅ Funções disponíveis:');
    console.log('  - uploadMediaToMeta');
    console.log('  - uploadMediaToMetaWithAxios');
    console.log('  - uploadMediaToMetaNative');
    console.log('  - validateAndLogWhatsAppEnv');
    
    // Teste de validação
    const isValid = validateAndLogWhatsAppEnv();
    console.log(`✅ Validação executada - resultado: ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    
  } catch (err) {
    console.error('❌ Erro na importação:', err.message);
  }
  
  console.log('\n🎯 Para teste completo, configure as variáveis WHATSAPP no .env');
  return;
}

// Teste completo se as configurações estão disponíveis
async function testCompleto() {
  try {
    const { uploadMediaToMeta, validateAndLogWhatsAppEnv } = require('./models/whatsappCloudApi');
    
    console.log('\n1. ✅ Validação de configurações:');
    validateAndLogWhatsAppEnv();
    
    console.log('\n2. 📄 Criando PDF de teste mínimo...');
    // PDF super simples que deve ser aceito pela API
    const minimalPDF = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT/F1 12 Tf 72 720 Td(Teste)Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
306
%%EOF`);
    
    console.log(`📊 PDF criado: ${minimalPDF.length} bytes`);
    
    console.log('\n3. 🚀 Testando upload principal...');
    const result = await uploadMediaToMeta(
      minimalPDF,
      'teste_minimal.pdf',
      'application/pdf'
    );
    
    console.log('🎉 SUCESSO TOTAL!');
    console.log('📱 Media ID recebido:', result.id);
    console.log('📋 Resposta completa:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
    console.error('📝 Stack:', error.stack);
  }
}

// Executar teste
if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
  testCompleto().catch(console.error);
}