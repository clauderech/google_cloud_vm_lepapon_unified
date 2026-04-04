'use strict';

/**
 * Valida e loga as configurações do WhatsApp .env
 */
function validateAndLogWhatsAppEnv() {
  const timestamp = new Date().toISOString();
  
  console.log(`\n[WHATSAPP_ENV_CHECK][${timestamp}] ========================================`);
  console.log('[WHATSAPP_ENV_CHECK] Validando configurações WhatsApp do .env:');
  
  const configs = {
    WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
    WHATSAPP_GRAPH_VERSION: process.env.WHATSAPP_GRAPH_VERSION,
    WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME,
    WHATSAPP_TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG,
    WHATSAPP_TEMPLATE_RECIPIENT_TYPE: process.env.WHATSAPP_TEMPLATE_RECIPIENT_TYPE,
    WHATSAPP_TEXT_RECIPIENT_TYPE: process.env.WHATSAPP_TEXT_RECIPIENT_TYPE,
  };
  
  let allValid = true;
  
  // Validar configurações críticas
  const criticalConfigs = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  
  for (const key in configs) {
    const value = configs[key];
    const isCritical = criticalConfigs.includes(key);
    
    if (key.includes('TOKEN')) {
      // Mascarar token por segurança
      const maskedValue = value ? `${value.substring(0, 8)}***${value.substring(value.length - 4)}` : 'UNDEFINED';
      console.log(`[WHATSAPP_ENV_CHECK] ${key}: ${maskedValue} ${value ? '✅' : '❌'}`);
    } else {
      console.log(`[WHATSAPP_ENV_CHECK] ${key}: ${value || 'UNDEFINED'} ${value ? '✅' : (isCritical ? '❌' : '⚠️')}`);
    }
    
    if (isCritical && !value) {
      allValid = false;
    }
  }
  
  console.log(`[WHATSAPP_ENV_CHECK] Status geral: ${allValid ? '✅ CONFIGURADO' : '❌ ERRO - CONFIGURAÇÕES CRÍTICAS FALTANDO'}`);
  console.log('[WHATSAPP_ENV_CHECK] ========================================\n');
  
  return allValid;
}

function buildTemplateComponentsFromEnv() {
  const footerText = process.env.WHATSAPP_TEMPLATE_FOOTER_TEXT;

  // quick_reply | url | flow
  const buttonSubtype = process.env.WHATSAPP_TEMPLATE_BUTTON_SUBTYPE || 'flow';
  const buttonIndex = process.env.WHATSAPP_TEMPLATE_BUTTON_INDEX || '0';
  const buttonPayload = process.env.WHATSAPP_TEMPLATE_BUTTON_PAYLOAD;
  const buttonUrlText = process.env.WHATSAPP_TEMPLATE_BUTTON_URL_TEXT;

  const components = [];


  if (buttonSubtype === 'quick_reply' && buttonPayload) {
    components.push({
      type: 'button',
      sub_type: 'quick_reply',
      index: String(buttonIndex),
      parameters: [{ type: 'payload', payload: String(buttonPayload) }],
    });
  }

  if (buttonSubtype === 'url' && buttonUrlText) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: String(buttonIndex),
      parameters: [{ type: 'text', text: String(buttonUrlText) }],
    });
  }

  if (buttonSubtype === 'flow') {
    components.push({
      type: 'button',
      sub_type: 'flow',
      index: String(buttonIndex),
    });
  }

  return components.length > 0 ? components : undefined;
}

async function sendTemplateMessage({
  to,
  templateName,
  languageCode,
  components,
  recipientType,
  accessToken,
  phoneNumberId,
  graphVersion,
}) {
  if (!to) throw new Error('sendTemplateMessage: "to" é obrigatório');

  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const pnid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = graphVersion || process.env.WHATSAPP_GRAPH_VERSION || '20.0';

  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN não definido');
  if (!pnid) throw new Error('WHATSAPP_PHONE_NUMBER_ID não definido');

  const url = `https://graph.facebook.com/v${version}/${pnid}/messages`;

  const tplName = templateName || process.env.WHATSAPP_TEMPLATE_NAME;
  if (!tplName) throw new Error('templateName/WHATSAPP_TEMPLATE_NAME não definido');

  const lang = languageCode || process.env.WHATSAPP_TEMPLATE_LANG || 'en';

  const rt =
    recipientType || process.env.WHATSAPP_TEMPLATE_RECIPIENT_TYPE || undefined;

  const payload = {
    messaging_product: 'whatsapp',
    ...(rt ? { recipient_type: String(rt) } : {}),
    to: String(to),
    type: 'template',
    template: {
      name: tplName,
      language: { code: lang },
      ...(components ? { components } : {}),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const apiMessage = json?.error?.message;
    const err = new Error(
      `WhatsApp API error ${response.status}${apiMessage ? `: ${apiMessage}` : ''}`
    );
    err.status = response.status;
    err.details = json;
    err.detailsText = (() => {
      try {
        return JSON.stringify(json, null, 2);
      } catch {
        return String(json);
      }
    })();
    err.requestPayload = payload;
    err.requestPayloadText = (() => {
      try {
        return JSON.stringify(payload, null, 2);
      } catch {
        return String(payload);
      }
    })();
    throw err;
  }

  return json;
}

async function sendTextMessage({
  to,
  body,
  previewUrl,
  recipientType,
  accessToken,
  phoneNumberId,
  graphVersion,
}) {
  if (!to) throw new Error('sendTextMessage: "to" é obrigatório');
  if (!body) throw new Error('sendTextMessage: "body" é obrigatório');

  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const pnid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = graphVersion || process.env.WHATSAPP_GRAPH_VERSION || '20.0';

  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN não definido');
  if (!pnid) throw new Error('WHATSAPP_PHONE_NUMBER_ID não definido');

  const url = `https://graph.facebook.com/v${version}/${pnid}/messages`;

  const rt =
    recipientType || process.env.WHATSAPP_TEXT_RECIPIENT_TYPE || undefined;

  const payload = {
    messaging_product: 'whatsapp',
    ...(rt ? { recipient_type: String(rt) } : {}),
    to: String(to),
    type: 'text',
    text: {
      body: String(body),
      preview_url: Boolean(previewUrl ?? false),
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const apiMessage = json?.error?.message;
    const err = new Error(
      `WhatsApp API error ${response.status}${apiMessage ? `: ${apiMessage}` : ''}`
    );
    err.status = response.status;
    err.details = json;
    err.detailsText = (() => {
      try {
        return JSON.stringify(json, null, 2);
      } catch {
        return String(json);
      }
    })();
    err.requestPayload = payload;
    err.requestPayloadText = (() => {
      try {
        return JSON.stringify(payload, null, 2);
      } catch {
        return String(payload);
      }
    })();
    throw err;
  }

  return json;
}

async function sendCatalogMessage(catalogPayload) {
  if (!catalogPayload) throw new Error('sendCatalogMessage: catalogPayload é obrigatório');

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const pnid = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || '20.0';

  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN não definido');
  if (!pnid) throw new Error('WHATSAPP_PHONE_NUMBER_ID não definido');

  const url = `https://graph.facebook.com/v${version}/${pnid}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(catalogPayload),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const apiMessage = json?.error?.message;
    const err = new Error(
      `WhatsApp API error ${response.status}${apiMessage ? `: ${apiMessage}` : ''}`
    );
    err.status = response.status;
    err.details = json;
    err.detailsText = (() => {
      try {
        return JSON.stringify(json, null, 2);
      } catch {
        return String(json);
      }
    })();
    err.requestPayload = catalogPayload;
    err.requestPayloadText = (() => {
      try {
        return JSON.stringify(catalogPayload, null, 2);
      } catch {
        return String(catalogPayload);
      }
    })();
    throw err;
  }

  return json;
}

async function sendFlowMessage({
  to,
  flowId,
  flowToken,
  templateName,
  recipientType,
  accessToken,
  phoneNumberId,
  graphVersion,
}) {
  if (!to) throw new Error('sendFlowMessage: "to" é obrigatório');
  if (!flowId) throw new Error('sendFlowMessage: "flowId" é obrigatório');
  if (!flowToken) throw new Error('sendFlowMessage: "flowToken" é obrigatório');

  const token = accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const pnid = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = graphVersion || process.env.WHATSAPP_GRAPH_VERSION || '20.0';

  if (!token) throw new Error('WHATSAPP_ACCESS_TOKEN não definido');
  if (!pnid) throw new Error('WHATSAPP_PHONE_NUMBER_ID não definido');

  const url = `https://graph.facebook.com/v${version}/${pnid}/messages`;

  const tplName = templateName || 'pedidos';
  const rt = recipientType || 'individual';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: rt,
    to: String(to),
    type: 'template',
    template: {
      name: tplName,
      language: {
        code: 'pt_BR',
      },
      components: [
        {
          type: 'button',
          sub_type: 'flow',
          index: 0,
          parameters: [
            {
              type: 'action',
              "action": {                
                flow_token: String(flowToken)
              }
            },
          ],
        },
      ],
    },
  };

  console.log('[sendFlowMessage] 📤 Template enviado para Meta:');
  console.log('[sendFlowMessage]', JSON.stringify(payload, null, 2));
  console.log('[sendFlowMessage] URL:', url);
  console.log('[sendFlowMessage] Flow ID:', String(flowId));
  console.log('[sendFlowMessage] Flow Token:', String(flowToken));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    const apiMessage = json?.error?.message;
    const err = new Error(
      `WhatsApp API error ${response.status}${apiMessage ? `: ${apiMessage}` : ''}`
    );
    err.status = response.status;
    err.details = json;
    err.detailsText = (() => {
      try {
        return JSON.stringify(json, null, 2);
      } catch {
        return String(json);
      }
    })();
    err.requestPayload = payload;
    err.requestPayloadText = (() => {
      try {
        return JSON.stringify(payload, null, 2);
      } catch {
        return String(payload);
      }
    })();
    throw err;
  }

  return json;
}

/**
 * Upload do arquivo para Meta Cloud API - Versão alternativa mais simples
 */
async function uploadMediaToMetaAlternative(fileBuffer, filename, mimeType) {
  const timestamp = new Date().toISOString();
  
  console.log(`\n[UPLOAD_ALT][${timestamp}] ========================================`);
  console.log('[UPLOAD_ALT] Tentativa ALTERNATIVA de upload para Meta Cloud API');
  
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  if (!phoneNumberId || !accessToken) {
    throw new Error('Configurações WhatsApp faltando');
  }
  
  console.log(`[UPLOAD_ALT] Filename: ${filename}, Size: ${fileBuffer.length} bytes`);
  
  // Abordagem mais simples com form-data
  const FormData = require('form-data');
  const form = new FormData();
  
  // Usar método mais direto
  form.append('file', fileBuffer, filename);  // Simplificado
  form.append('type', mimeType);
  form.append('messaging_product', 'whatsapp');
  
  const uploadUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/media`;
  
  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    const json = await response.json();
    console.log(`[UPLOAD_ALT] Status: ${response.status}, Response:`, json);
    
    if (!response.ok) {
      throw new Error(`Alternative upload failed: ${response.status} - ${JSON.stringify(json)}`);
    }
    
    console.log(`[UPLOAD_ALT] ✅ Upload alternativo bem-sucedido! ID: ${json.id}`);
    return json;
    
  } catch (error) {
    console.error(`[UPLOAD_ALT] ❌ Erro:`, error);
    throw error;
  }
}

/**
 * Upload do arquivo para Meta Cloud API
 */
async function uploadMediaToMeta(fileBuffer, filename, mimeType) {
  const timestamp = new Date().toISOString();
  
  console.log(`\n[UPLOAD_MEDIA][${timestamp}] ========================================`);
  console.log('[UPLOAD_MEDIA] Iniciando upload para Meta Cloud API');
  
  // Validar configurações antes do upload
  console.log('[UPLOAD_MEDIA] Verificando variáveis de ambiente...');
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  console.log(`[UPLOAD_MEDIA] WHATSAPP_PHONE_NUMBER_ID: ${phoneNumberId ? `${phoneNumberId.substring(0, 8)}***${phoneNumberId.substring(phoneNumberId.length - 4)}` : 'UNDEFINED'} ${phoneNumberId ? '✅' : '❌'}`);
  console.log(`[UPLOAD_MEDIA] WHATSAPP_ACCESS_TOKEN: ${accessToken ? `${accessToken.substring(0, 8)}***${accessToken.substring(accessToken.length - 4)}` : 'UNDEFINED'} ${accessToken ? '✅' : '❌'}`);
  
  if (!phoneNumberId) {
    const error = 'WHATSAPP_PHONE_NUMBER_ID não definido no .env';
    console.error(`[UPLOAD_MEDIA] ❌ ERRO: ${error}`);
    throw new Error(error);
  }
  
  if (!accessToken) {
    const error = 'WHATSAPP_ACCESS_TOKEN não definido no .env';
    console.error(`[UPLOAD_MEDIA] ❌ ERRO: ${error}`);
    throw new Error(error);
  }
  
  console.log(`[UPLOAD_MEDIA] Parâmetros do arquivo:`);
  console.log(`[UPLOAD_MEDIA] - Filename: ${filename}`);
  console.log(`[UPLOAD_MEDIA] - MIME Type: ${mimeType}`);
  console.log(`[UPLOAD_MEDIA] - Buffer Size: ${fileBuffer.length} bytes`);
  console.log(`[UPLOAD_MEDIA] - Buffer Type: ${typeof fileBuffer}`);
  console.log(`[UPLOAD_MEDIA] - Is Buffer: ${Buffer.isBuffer(fileBuffer)}`);
  
  const FormData = require('form-data');
  const form = new FormData();
  
  // Método compatível com Meta API - seguindo documentação oficial
  form.append('messaging_product', 'whatsapp');
  form.append('file', fileBuffer, {
    filename: filename,
    contentType: mimeType
  });
  form.append('type', mimeType);
  
  console.log(`[UPLOAD_MEDIA] FormData criado com:`);
  console.log(`[UPLOAD_MEDIA] - messaging_product: whatsapp (PRIMEIRO)`);
  console.log(`[UPLOAD_MEDIA] - file: ${filename} (${fileBuffer.length} bytes)`);
  console.log(`[UPLOAD_MEDIA] - type: ${mimeType}`);

  const uploadUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/media`;
  console.log(`[UPLOAD_MEDIA] URL de upload: ${uploadUrl}`);
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    ...form.getHeaders()
  };
  
  console.log(`[UPLOAD_MEDIA] Headers:`, Object.keys(headers).map(key => 
    key === 'Authorization' ? `${key}: Bearer ***[REDACTED]***` : `${key}: ${headers[key]}`
  ));
  
  console.log('[UPLOAD_MEDIA] Enviando requisição para Meta API...');
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: headers,
    body: form
  });

  console.log(`[UPLOAD_MEDIA] Resposta recebida - Status: ${response.status}`);
  console.log(`[UPLOAD_MEDIA] Response Headers:`, Object.fromEntries(response.headers.entries()));
  
  const json = await response.json();
  console.log(`[UPLOAD_MEDIA] Response Body:`, JSON.stringify(json, null, 2));
  
  if (!response.ok) {
    console.error(`[UPLOAD_MEDIA] ❌ ERRO no upload principal:`);
    console.error(`[UPLOAD_MEDIA] Status: ${response.status}`);
    console.error(`[UPLOAD_MEDIA] URL: ${uploadUrl}`);
    console.error(`[UPLOAD_MEDIA] Headers enviados:`, Object.keys(headers).map(key => 
      key === 'Authorization' ? `${key}: Bearer [TOKEN_MASCARADO]` : `${key}: ${headers[key]}`
    ));
    console.error(`[UPLOAD_MEDIA] Response:`, JSON.stringify(json, null, 2));
    
    // Tentar método alternativo como fallback
    console.log(`[UPLOAD_MEDIA] 🔄 Tentando método alternativo simplificado...`);
    try {
      // Método super-simplificado seguindo documentação Meta exatamente
      const FormData = require('form-data');
      const simpleForm = new FormData();
      
      // Ordem e formato EXATO da documentação 
      simpleForm.append('messaging_product', 'whatsapp');
      simpleForm.append('file', fileBuffer, filename);  // O mais simples possível
      simpleForm.append('type', mimeType);
      
      console.log(`[UPLOAD_MEDIA] Tentativa SIMPLIFICADA com ordem da documentação`);
      
      const simpleResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...simpleForm.getHeaders()
        },
        body: simpleForm
      });

      const simpleResult = await simpleResponse.json();
      console.log(`[UPLOAD_MEDIA] Método simples - Status: ${simpleResponse.status}`);
      console.log(`[UPLOAD_MEDIA] Método simples - Response:`, JSON.stringify(simpleResult, null, 2));
      
      if (simpleResponse.ok) {
        console.log(`[UPLOAD_MEDIA] ✅ Upload bem-sucedido via método SIMPLIFICADO!`);
        console.log('[UPLOAD_MEDIA] ========================================\n');
        return simpleResult;
      }
      
      // Se ambos falharam, tentar o método alternativo completo
      const alternativeResult = await uploadMediaToMetaAlternative(fileBuffer, filename, mimeType);
      console.log(`[UPLOAD_MEDIA] ✅ Upload bem-sucedido via método alternativo!`);
      return alternativeResult;
      
    } catch (altError) {
      console.error(`[UPLOAD_MEDIA] ❌ Todos os métodos falharam:`, altError.message);
      throw new Error(`Upload failed: Primary (${response.status}), simplified and alternative methods all failed - ${JSON.stringify(json)}`);
    }
  }
  
  console.log(`[UPLOAD_MEDIA] ✅ Upload bem-sucedido!`);
  console.log(`[UPLOAD_MEDIA] Media ID: ${json.id}`);
  console.log('[UPLOAD_MEDIA] ========================================\n');
  
  return json;
}

/**
 * Envia documento via WhatsApp
 */
async function sendMediaMessage({ to, mediaId, filename, caption }) {
  const timestamp = new Date().toISOString();
  
  console.log(`\n[SEND_MEDIA][${timestamp}] ========================================`);
  console.log('[SEND_MEDIA] Enviando documento via WhatsApp');
  
  // Validar configurações antes do envio
  console.log('[SEND_MEDIA] Verificando variáveis de ambiente...');
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  
  console.log(`[SEND_MEDIA] WHATSAPP_PHONE_NUMBER_ID: ${phoneNumberId ? `${phoneNumberId.substring(0, 8)}***${phoneNumberId.substring(phoneNumberId.length - 4)}` : 'UNDEFINED'} ${phoneNumberId ? '✅' : '❌'}`);
  console.log(`[SEND_MEDIA] WHATSAPP_ACCESS_TOKEN: ${accessToken ? `${accessToken.substring(0, 8)}***${accessToken.substring(accessToken.length - 4)}` : 'UNDEFINED'} ${accessToken ? '✅' : '❌'}`);
  
  if (!phoneNumberId) {
    const error = 'WHATSAPP_PHONE_NUMBER_ID não definido no .env';
    console.error(`[SEND_MEDIA] ❌ ERRO: ${error}`);
    throw new Error(error);
  }
  
  if (!accessToken) {
    const error = 'WHATSAPP_ACCESS_TOKEN não definido no .env';
    console.error(`[SEND_MEDIA] ❌ ERRO: ${error}`);
    throw new Error(error);
  }
  
  console.log(`[SEND_MEDIA] Parâmetros da mensagem:`);
  console.log(`[SEND_MEDIA] - Destinatário: ${to}`);
  console.log(`[SEND_MEDIA] - Media ID: ${mediaId}`);
  console.log(`[SEND_MEDIA] - Filename: ${filename}`);
  console.log(`[SEND_MEDIA] - Caption: ${caption ? caption.substring(0, 100) + (caption.length > 100 ? '...' : '') : 'Sem caption'}`);
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: String(to),
    type: 'document',
    document: {
      id: mediaId,
      filename: filename,
      caption: caption
    }
  };

  const sendUrl = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  console.log(`[SEND_MEDIA] URL de envio: ${sendUrl}`);
  console.log(`[SEND_MEDIA] Payload:`, JSON.stringify(payload, null, 2));
  
  console.log('[SEND_MEDIA] Enviando mensagem para WhatsApp API...');

  const response = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  console.log(`[SEND_MEDIA] Resposta recebida - Status: ${response.status}`);

  const json = await response.json();
  
  if (!response.ok) {
    console.error(`[SEND_MEDIA] ❌ ERRO no envio:`);
    console.error(`[SEND_MEDIA] Status: ${response.status}`);
    console.error(`[SEND_MEDIA] Response:`, JSON.stringify(json, null, 2));
    console.error(`[SEND_MEDIA] Payload enviado:`, JSON.stringify(payload, null, 2));
    throw new Error(`Send failed: ${response.status} - ${JSON.stringify(json)}`);
  }
  
  console.log(`[SEND_MEDIA] ✅ Mensagem enviada com sucesso!`);
  console.log(`[SEND_MEDIA] WhatsApp Message ID: ${json.messages?.[0]?.id}`);
  console.log('[SEND_MEDIA] ========================================\n');
  
  return json;
}

module.exports = {
  validateAndLogWhatsAppEnv,
  buildTemplateComponentsFromEnv,
  sendTemplateMessage,
  sendTextMessage,
  sendCatalogMessage,
  sendFlowMessage,
  uploadMediaToMeta,
  uploadMediaToMetaAlternative,
  sendMediaMessage,
};
