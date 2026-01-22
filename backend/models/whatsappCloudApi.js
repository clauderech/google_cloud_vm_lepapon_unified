'use strict';

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

module.exports = {
  buildTemplateComponentsFromEnv,
  sendTemplateMessage,
  sendTextMessage,
  sendCatalogMessage,
  sendFlowMessage,
};
