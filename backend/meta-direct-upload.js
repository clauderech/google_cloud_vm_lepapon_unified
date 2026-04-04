/**
 * Script de teste direto para upload WhatsApp seguindo documentação Meta EXATA
 */

const FormData = require('form-data');

function createUploadFunction() {
  return async function uploadToMeta(fileBuffer, filename, mimeType, accessToken, phoneNumberId) {
    console.log(`[META_DIRECT] Iniciando upload direto...`);
    console.log(`[META_DIRECT] File: ${filename}, Size: ${fileBuffer.length}, Type: ${mimeType}`);
    
    const form = new FormData();
    
    // Ordem EXATA da documentação Meta
    form.append('messaging_product', 'whatsapp');
    form.append('file', fileBuffer, filename); // Formato mais simples possível
    form.append('type', mimeType);
    
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/media`;
    console.log(`[META_DIRECT] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();
    console.log(`[META_DIRECT] Status: ${response.status}`);
    console.log(`[META_DIRECT] Response:`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(`Direct upload failed: ${response.status} - ${JSON.stringify(result)}`);
    }
    
    return result;
  };
}

module.exports = { createUploadFunction };