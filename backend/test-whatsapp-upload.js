#!/usr/bin/env node
/**
 * Teste simples para verificar se o upload do WhatsApp está funcionando
 */

require('dotenv').config({ path: '/var/www/google_cloud_vm_lepapon_unified/.env' });

const { uploadMediaToMeta, validateAndLogWhatsAppEnv } = require('./models/whatsappCloudApi');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  console.log('🧪 TESTE DE UPLOAD WHATSAPP\n');
  
  // Validar configurações
  console.log('1. Validando configurações...');
  const isValid = validateAndLogWhatsAppEnv();
  
  if (!isValid) {
    console.error('❌ Configurações inválidas. Abortando teste.');
    return;
  }
  
  // Criar um PDF de teste simples
  console.log('\n2. Criando PDF de teste...');
  const testContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Teste PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000104 00000 n 
0000000192 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
286
%%EOF`);
  
  console.log(`PDF de teste criado: ${testContent.length} bytes`);
  
  try {
    console.log('\n3. Tentando upload...');
    const result = await uploadMediaToMeta(
      testContent,
      'teste_upload.pdf',
      'application/pdf'
    );
    
    console.log('✅ Upload bem-sucedido!');
    console.log('Media ID:', result.id);
    
  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
  }
}

if (require.main === module) {
  testUpload().catch(console.error);
}