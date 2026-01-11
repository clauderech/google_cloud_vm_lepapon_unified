'use strict';

const { db } = require('../config/knex');
const { createQueue } = require('./asyncQueue');
const {
  buildTemplateComponentsFromEnv,
  sendTemplateMessage,
  sendTextMessage,
} = require('./whatsappCloudApi');

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const outboundQueue = createQueue({
  concurrency: toInt(process.env.WHATSAPP_OUTBOUND_CONCURRENCY || 2, 2),
  maxSize: toInt(process.env.WHATSAPP_OUTBOUND_MAX || 2000, 2000),
});

async function reserveFirstResponse(waMessageId) {
  if (!waMessageId) return false;

  try {
    // Verificar se mensagem já foi respondida
    const existing = await db('whatsapp_messages')
      .where('wa_message_id', waMessageId)
      .select('id')
      .first();
    
    if (!existing) {
      console.warn(`[Responder] Mensagem ${waMessageId} não encontrada`);
      return false;
    }
    
    // Marcar como respondida (usando status)
    await db('whatsapp_messages')
      .where('wa_message_id', waMessageId)
      .update({
        delivery_status: 'delivered',
      });
    
    return true;
  } catch (error) {
    console.error('[Responder] Erro ao reservar resposta:', error.message);
    // Se erro, continuar mesmo assim
    return true;
  }
}

function enqueueFirstResponse({ waMessageId, to }) {
  const templateName =
    process.env.WHATSAPP_TEMPLATE_NAME ||
    'primeiro_contato'; /* default template name */

  const components = buildTemplateComponentsFromEnv();

  return outboundQueue.enqueue(async () => {
    const reserved = await reserveFirstResponse(waMessageId);
    if (!reserved) return;

    const result = await sendTemplateMessage({
      to,
      templateName,
      components,
    });
  });
}

function enqueueOrderAck({ waMessageId, to, body }) {
  const text =
    body ||
    'Pedido recebido! logo entraremos em contato para confirmar.';

  return outboundQueue.enqueue(async () => {
    const reserved = await reserveFirstResponse(waMessageId);
    if (!reserved) return;

    const result = await sendTextMessage({ to, body: text, previewUrl: false });
  });
}

module.exports = {
  enqueueFirstResponse,
  enqueueOrderAck,
  outboundQueue,
};
