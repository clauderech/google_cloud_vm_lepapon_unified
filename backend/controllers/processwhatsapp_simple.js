const {
  parseWebhookPayload,
  persistUserIdentification,
  persistMessage,
  persistOrder,
} = require('../models/processwhatsapp.js');

const { sendTextMessage, sendInteractiveMenuMessage } = require('../models/whatsappCloudApi.js');

const MENU_BUTTONS = [
  { id: 'INFO', title: 'Informações' },
  { id: 'HELP', title: 'Ajuda' },
  { id: 'HUMAN', title: 'Falar com atendente' },
];

function isOrderMessage(message) {
  return message && message.type === 'order' && message.order;
}

function buildOrderData(message) {
  return {
    order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    catalog_id: message.order?.catalog_id || null,
    product_items: Array.isArray(message.order?.product_items)
      ? message.order.product_items
      : [],
    delivery_type: 'pickup',
    source_message_wa_id: message.id,
  };
}

async function handleVerifyWebhook(req, res) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && challenge) {
    if (!VERIFY_TOKEN) {
      return res.status(500).send('Servidor sem WHATSAPP_VERIFY_TOKEN configurado');
    }
    if (token !== VERIFY_TOKEN) {
      return res.status(403).send('Token de verificação inválido');
    }
    return res.status(200).send(String(challenge));
  }

  return res.status(400).send('Parâmetros inválidos');
}

async function handleWebhookEvent(req, res) {
  try {
    const body = req.body;

    if (!body || body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const { messages, statuses } = parseWebhookPayload(body);

    for (const message of messages) {
      if (!message) continue;

      const {
        business_scoped_user_id,
        phone_number,
        username,
        contact_name,
        identification_source,
      } = message;

      try {
        const persistedUserId = await persistUserIdentification({
          business_scoped_user_id,
          phone_number,
          username,
          contact_name,
          identification_source,
        });

        if (!persistedUserId) {
          console.warn('[SimpleWebhook] Falha ao persistir usuário, pulando mensagem');
          continue;
        }

        await persistMessage(persistedUserId, message);

        if (isOrderMessage(message)) {
          const orderData = buildOrderData(message);
          const orderId = await persistOrder(persistedUserId, orderData);

          if (orderId) {
            await sendTextMessage({
              to: String(message.from),
              body: `Recebemos seu pedido! Número: ${orderData.order_number}. Em breve entraremos em contato para confirmar.`,
              previewUrl: false,
            });
            console.log(`[SimpleWebhook] Pedido persistido e confirmação enviada: ${orderData.order_number}`);
          } else {
            console.warn('[SimpleWebhook] Pedido não foi criado corretamente');
          }
        } else {
          await sendInteractiveMenuMessage({
            to: String(message.from),
            bodyText: 'Olá! Escolha uma opção:',
            buttons: MENU_BUTTONS,
          });
          console.log('[SimpleWebhook] Menu interativo enviado para mensagem normal');
        }
      } catch (error) {
        console.error('[SimpleWebhook] Erro ao processar mensagem:', error.message);
      }
    }

    if (Array.isArray(statuses) && statuses.length > 0) {
      console.log(`[SimpleWebhook] Status recebidos: ${statuses.length}`);
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('[SimpleWebhook] Erro no webhook:', error.message);
    return res.sendStatus(500);
  }
}

module.exports = {
  handleVerifyWebhook,
  handleWebhookEvent,
};
