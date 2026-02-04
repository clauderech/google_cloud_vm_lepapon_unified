'use strict';

import { db } from '../config/knex.js';

function extractTextFromMessage(message) {
  const type = message?.type;

  if (type === 'text') return message?.text?.body;
  if (type === 'button') return message?.button?.text;
  if (type === 'interactive') {
    return (
      message?.interactive?.button_reply?.title ||
      message?.interactive?.list_reply?.title
    );
  }

  // Em mídias e documentos, o texto relevante geralmente vem como "caption".
  if (type === 'image') return message?.image?.caption;
  if (type === 'video') return message?.video?.caption;
  if (type === 'document') return message?.document?.caption;

  if (type === 'order') {
    const items = Array.isArray(message?.order?.product_items)
      ? message.order.product_items
      : [];
    const count = items.reduce(
      (sum, item) => sum + (Number(item?.quantity) || 0),
      0,
    );
    return `Pedido recebido (${count} item(ns))`;
  }

  return undefined;
}

function extractMediaFromMessage(message) {
  const type = message?.type;

  if (type === 'image') {
    return {
      kind: 'image',
      id: message?.image?.id,
      mime_type: message?.image?.mime_type,
      sha256: message?.image?.sha256,
      caption: message?.image?.caption,
    };
  }

  if (type === 'video') {
    return {
      kind: 'video',
      id: message?.video?.id,
      mime_type: message?.video?.mime_type,
      sha256: message?.video?.sha256,
      caption: message?.video?.caption,
    };
  }

  if (type === 'audio') {
    return {
      kind: 'audio',
      id: message?.audio?.id,
      mime_type: message?.audio?.mime_type,
      sha256: message?.audio?.sha256,
      voice: message?.audio?.voice,
    };
  }

  if (type === 'sticker') {
    return {
      kind: 'sticker',
      id: message?.sticker?.id,
      mime_type: message?.sticker?.mime_type,
      sha256: message?.sticker?.sha256,
      animated: message?.sticker?.animated,
    };
  }

  if (type === 'document') {
    return {
      kind: 'document',
      id: message?.document?.id,
      mime_type: message?.document?.mime_type,
      sha256: message?.document?.sha256,
      filename: message?.document?.filename,
      caption: message?.document?.caption,
    };
  }

  return undefined;
}

function parseWebhookPayload(body) {
  const messages = [];
  const statuses = [];

  const entries = Array.isArray(body?.entry) ? body.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;

      const rawMessages = Array.isArray(value?.messages) ? value.messages : [];
      for (const message of rawMessages) {
        // Extrair contato e identificadores com prioridade
        const contact = message?.contacts?.[0];
        const contactWaId = contact?.wa_id;
        const contactName = contact?.profile?.name;
        const messageFrom = message?.from;
        
        // Determinar os identificadores (prioridade: business_scoped_user_id > username > phone_number)
        let businessScopedUserId = null;
        let username = null;
        let phoneNumber = null;
        
        // Tentar identificar business_scoped_user_id (formato alphanummérico, sem dígitos puros)
        if (messageFrom && /^[A-Z0-9]+$/.test(messageFrom) && !/^\d+$/.test(messageFrom)) {
          businessScopedUserId = messageFrom;
        }
        
        // Tentar identificar username (começa com @)
        if (messageFrom && messageFrom.startsWith('@')) {
          username = messageFrom;
        }
        
        // Phone number (dígitos puros, de contactWaId ou messageFrom)
        if (contactWaId && /^\d+$/.test(contactWaId)) {
          phoneNumber = contactWaId;
        } else if (messageFrom && /^\d+$/.test(messageFrom)) {
          phoneNumber = messageFrom;
        }
        
        // Determinar identificador primário com prioridade
        const primaryId = businessScopedUserId || username || phoneNumber;
        const identificationSource = businessScopedUserId 
          ? 'business_scoped_id'
          : (username ? 'username' : 'phone');
        
        messages.push({
          // Identificadores (com prioridade)
          from: phoneNumber,                           // Mantém compatibilidade
          phone_number: phoneNumber,                   // Explícito para persistência
          business_scoped_user_id: businessScopedUserId,
          username: username,
          primary_identifier: primaryId,
          identification_source: identificationSource,
          
          // Dados da mensagem
          id: message?.id,
          timestamp: message?.timestamp,
          type: message?.type,
          text: extractTextFromMessage(message),
          media: extractMediaFromMessage(message),
          order: message?.order || null,
          
          // Contato (se disponível)
          contact_name: contactName,
          contact_wa_id: contactWaId,
        });
      }

      const rawStatuses = Array.isArray(value?.statuses) ? value.statuses : [];
      for (const status of rawStatuses) {
        statuses.push({
          id: status?.id,
          status: status?.status,
          timestamp: status?.timestamp,
          recipient_id: status?.recipient_id,
          conversationId: status?.conversation?.id,
          pricingCategory: status?.pricing?.category,
        });
      }
    }
  }

  return { messages, statuses };
}

function parseUnixSeconds(value) {
  if (value === undefined || value === null) return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function mapMessageToDbRow(message) {
  const media = message?.media;

  return {
    wa_message_id: message?.id || null,
    wa_timestamp: parseUnixSeconds(message?.timestamp),
    wa_type: message?.type || null,
    text: message?.text || null,

    media_kind: media?.kind || null,
    media_id: media?.id || null,
    media_mime_type: media?.mime_type || null,
    media_sha256: media?.sha256 || null,
    media_filename: media?.filename || null,
    media_caption: media?.caption || null,
  };
}

function mapStatusToDbRow(status) {
  return {
    wa_message_id: status?.id || null,
    wa_status: status?.status || null,
    wa_timestamp: parseUnixSeconds(status?.timestamp),
    recipient_id: status?.recipient_id || null,
    conversation_id: status?.conversationId || null,
    pricing_category: status?.pricingCategory || null,
  };
}

async function persistParsedWebhook({ messages, statuses }) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const safeStatuses = Array.isArray(statuses) ? statuses : [];

  return db.transaction(async (trx) => {
    let insertedMessages = 0;
    let insertedStatuses = 0;

    const messageRows = safeMessages
      .map(mapMessageToDbRow)
      .filter((row) => row.wa_message_id);

    if (messageRows.length > 0) {
      // Evita duplicados pelo wa_message_id.
      const result = await trx('whatsapp_messages')
        .insert(messageRows)
        .onConflict('wa_message_id')
        .ignore();

      // Em MySQL, result pode ser um array vazio ou um insertId; contamos pelo input.
      insertedMessages = messageRows.length;
      void result;
    }

    const statusRows = safeStatuses
      .map(mapStatusToDbRow)
      .filter((row) => row.wa_message_id && row.wa_status && row.wa_timestamp !== null);

    if (statusRows.length > 0) {
      await trx('whatsapp_statuses')
        .insert(statusRows)
        .onConflict(['wa_message_id', 'wa_status', 'wa_timestamp'])
        .ignore();

      insertedStatuses = statusRows.length;
    }

    return { insertedMessages, insertedStatuses };
  });
}

/**
 * Obtém ou cria user_id baseado em identificador com prioridade
 */
async function getUserIdByIdentifier(primaryId) {
  if (!primaryId) return null;
  
  try {
    const user = await db('whatsapp_users')
      .where('primary_identifier', primaryId)
      .where('is_active', true)
      .first();
    
    return user?.id || null;
  } catch (error) {
    console.error('[DB] Erro ao buscar user por primaryId:', error.message);
    return null;
  }
}

/**
 * Persiste ou atualiza identificação de usuário
 */
async function persistUserIdentification(identificationData) {
  const {
    business_scoped_user_id,
    phone_number,
    username,
    contact_name,
    identification_source
  } = identificationData;
  
  if (!phone_number && !business_scoped_user_id && !username) {
    console.warn('[DB] Nenhum identificador fornecido para user');
    return null;
  }
  
  const primaryId = business_scoped_user_id || username || phone_number;
  
  try {
    // Tentar encontrar user existente
    let userId = await getUserIdByIdentifier(primaryId);
    
    if (userId) {
      // Atualizar user existente
      await db('whatsapp_users')
        .where('id', userId)
        .update({
          business_scoped_user_id: business_scoped_user_id || db.raw('business_scoped_user_id'),
          username: username || db.raw('username'),
          phone_number: phone_number || db.raw('phone_number'),
          primary_identifier: primaryId,
          identification_source,
          display_name: contact_name || db.raw('display_name'),
          last_message_at: db.fn.now(),
          updated_at: db.fn.now(),
        });
      
      console.log(`[DB] User ${userId} atualizado`);
    } else {
      // Criar novo user
      const result = await db('whatsapp_users')
        .insert({
          business_scoped_user_id,
          phone_number,
          username,
          primary_identifier: primaryId,
          identification_source,
          display_name: contact_name,
          first_message_at: db.fn.now(),
        });
      
      userId = result[0];
      
      // Registrar na tabela de mapeamento
      await db('whatsapp_user_identification_map').insert({
        user_id: userId,
        business_scoped_user_id,
        phone_number,
        username,
        created_at: db.fn.now(),
      });
      
      console.log(`[DB] Novo user ${userId} criado`);
    }
    
    return userId;
  } catch (error) {
    console.error('[DB] Erro ao persistir user identification:', error.message);
    throw error;
  }
}

/**
 * Persiste uma mensagem individual
 */
async function persistMessage(userId, messageData) {
  const {
    id: wa_message_id,
    timestamp: wa_timestamp,
    type: wa_type,
    text,
    media,
    is_from_user = true
  } = messageData;
  
  // Não persistir mensagens do tipo 'order' e 'interactive'
  if (wa_type === 'order' || wa_type === 'interactive') {
    console.log(`[DB] Mensagem tipo '${wa_type}' não será persistida (${wa_message_id})`);
    return null;
  }
  
  // Apenas persistir: texto, mídia, documentos
  const shouldPersist = wa_type === 'text' || wa_type === 'image' || wa_type === 'audio' || wa_type === 'video' || wa_type === 'document';
  if (!shouldPersist) {
    console.log(`[DB] Tipo de mensagem '${wa_type}' não será persistido (${wa_message_id})`);
    return null;
  }
  
  if (!wa_message_id) return null;
  
  try {
    const result = await db('whatsapp_messages')
      .insert({
        user_id: userId,
        wa_message_id,
        wa_timestamp: parseUnixSeconds(wa_timestamp),
        wa_type,
        text,
        media_id: media?.id,
        media_mime_type: media?.mime_type,
        media_caption: media?.caption,
        is_from_user,
        created_at: db.fn.now(),
      })
      .onConflict('wa_message_id')
      .ignore();
    
    if (result.length > 0) {
      console.log(`[DB] Mensagem ${wa_message_id} (tipo: ${wa_type}) persistida`);
      return result[0];
    }
    
    return null;
  } catch (error) {
    console.error('[DB] Erro ao persistir mensagem:', error.message);
    throw error;
  }
}

/**
 * Persiste uma interação (button_reply ou list_reply)
 */
async function persistInteraction(userId, interactionData) {
  const {
    id: wa_message_id,
    timestamp: wa_timestamp,
    type: wa_type,
    interactive
  } = interactionData;

  if (!wa_message_id || !interactive) return null;

  try {
    // Determinar tipo de interação e extrair dados
    let interactionType = null;
    let buttonId = null;
    let buttonTitle = null;
    let buttonDescription = null;

    if (interactive?.button_reply) {
      interactionType = 'button_reply';
      buttonId = interactive.button_reply.id;
      buttonTitle = interactive.button_reply.title;
    } else if (interactive?.list_reply) {
      interactionType = 'list_reply';
      buttonId = interactive.list_reply.id;
      buttonTitle = interactive.list_reply.title;
      buttonDescription = interactive.list_reply.description;
    }

    if (!interactionType) {
      console.log(`[DB] Tipo de interação desconhecido: ${JSON.stringify(interactive)}`);
      return null;
    }

    const result = await db('whatsapp_interactions')
      .insert({
        user_id: userId,
        wa_message_id,
        wa_timestamp: parseUnixSeconds(wa_timestamp),
        interaction_type: interactionType,
        button_id: buttonId,
        button_title: buttonTitle,
        button_description: buttonDescription,
        raw_data: JSON.stringify(interactive),
        created_at: db.fn.now(),
      })
      .onConflict('wa_message_id')
      .ignore();

    if (result.length > 0) {
      console.log(`[DB] Interação ${interactionType} persistida: ${buttonTitle} (${wa_message_id})`);
      return result[0];
    }

    return null;
  } catch (error) {
    console.error('[DB] Erro ao persistir interação:', error.message);
    throw error;
  }
}

/**
 * Persiste um pedido
 */
async function persistOrder(userId, orderData) {
  const {
    order_number,
    catalog_id,
    product_items,
    delivery_type = 'pickup',
    customer_notes,
    source_message_wa_id
  } = orderData;
  
  if (!order_number) {
    console.warn('[DB] order_number não fornecido');
    return null;
  }
  
  try {
    // Buscar ID numérico da mensagem se fornecido wa_id
    let sourceMessageId = null;
    if (source_message_wa_id) {
      const message = await db('whatsapp_messages')
        .select('id')
        .where('wa_message_id', source_message_wa_id)
        .first();
      sourceMessageId = message?.id || null;
    }
    
    // Calcular total
    const subtotal = (product_items || []).reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.item_price) || 0;
      return sum + (qty * price);
    }, 0);
    
    // Inserir order
    const result = await db('whatsapp_orders')
      .insert({
        user_id: userId,
        order_number,
        catalog_id,
        source_message_id: sourceMessageId,
        delivery_type,
        customer_notes,
        subtotal,
        total: subtotal,
        order_status: 'pending',
        order_date: db.fn.now(),
      });
    
    const orderId = result[0];
    console.log(`[DB] Order ${orderId} criada (${order_number})`);
    
    // Persistir items
    if (product_items && product_items.length > 0) {
      await persistOrderItems(orderId, product_items);
    }
    
    return orderId;
  } catch (error) {
    console.error('[DB] Erro ao persistir order:', error.message);
    throw error;
  }
}

/**
 * Persiste itens de um pedido
 */
async function persistOrderItems(orderId, items) {
  if (!items || !items.length) return;
  
  const orderItems = items.map(item => ({
    order_id: orderId,
    product_retailer_id: item.product_retailer_id,
    quantity: Number(item.quantity) || 1,
    unit_price: Number(item.item_price) || 0,
    total_price: (Number(item.quantity) || 1) * (Number(item.item_price) || 0),
    created_at: db.fn.now(),
  }));
  
  try {
    const result = await db('whatsapp_order_items')
      .insert(orderItems);
    
    console.log(`[DB] ${result.length} items do order ${orderId} persistidos`);
    return result;
  } catch (error) {
    console.error('[DB] Erro ao persistir order items:', error.message);
    throw error;
  }
}

/**
 * Persiste uma sessão de Flow
 */
async function persistFlowSession(userId, orderId, flowSessionId, flowToken) {
  if (!userId || !flowToken) {
    console.warn('[DB] Parâmetros inválidos para persistFlowSession');
    return null;
  }
  
  try {
    const result = await db('whatsapp_flow_sessions')
      .insert({
        flow_token: flowToken,
        flow_session_id: flowSessionId,
        user_id: userId,
        order_id: orderId || null,
        flow_status: 'initiated',
        created_at: db.fn.now(),
      })
      .onConflict('flow_token')
      .merge();
    
    console.log(`[DB] Flow session criada: ${flowToken} (order: ${orderId})`);
    return result[0];
  } catch (error) {
    console.error('[DB] Erro ao persistir flow session:', error.message);
    throw error;
  }
}

/**
 * Busca sessão de Flow pelo flow_token
 */
async function getFlowSessionByToken(flowToken) {
  if (!flowToken) return null;
  
  try {
    const session = await db('whatsapp_flow_sessions')
      .where('flow_token', flowToken)
      .first();
    
    return session;
  } catch (error) {
    console.error('[DB] Erro ao buscar flow session:', error.message);
    return null;
  }
}

/**
 * Atualiza status da sessão de Flow
 */
async function updateFlowSessionStatus(flowToken, status, collectedData = null) {
  if (!flowToken) return null;
  
  try {
    const updateData = {
      flow_status: status,
      last_interaction_at: db.fn.now(),
    };
    
    if (status === 'completed') {
      updateData.completed_at = db.fn.now();
    }
    
    if (collectedData) {
      updateData.collected_data = JSON.stringify(collectedData);
    }
    
    // Tentar atualizar pelo flow_token primeiro
    let result = await db('whatsapp_flow_sessions')
      .where('flow_token', flowToken)
      .update(updateData);
    
    // Se não encontrou, tentar pelo flow_session_id (para fallback com token "teste")
    if (result === 0 && flowToken.startsWith('test_')) {
      result = await db('whatsapp_flow_sessions')
        .where('flow_session_id', flowToken)
        .update(updateData);
    }
    
    if (result > 0) {
      console.log(`[DB] Flow session ${flowToken} atualizada: ${status}`);
    } else {
      console.warn(`[DB] Flow session não encontrada para atualizar: ${flowToken}`);
    }
    
    return result;
  } catch (error) {
    console.error('[DB] Erro ao atualizar flow session:', error.message);
    throw error;
  }
}

/**
 * Persiste uma interação do Flow para auditoria
 */
async function persistFlowInteraction(userId, flowData) {
  const {
    screen,
    user_input,
    action,
    flow_id,
    flow_name
  } = flowData;
  
  if (!screen) return null;
  
  try {
    const result = await db('whatsapp_flow_interactions')
      .insert({
        user_id: userId,
        flow_id: flow_id || null,
        flow_name: flow_name || null,
        screen_visited: screen,
        screen_action: action,
        action_timestamp: db.fn.now(),
        form_data: user_input ? JSON.stringify(user_input) : null,
        created_at: db.fn.now(),
      });
    
    console.log(`[DB] Flow interaction registrada: ${screen} - ${action}`);
    return result[0];
  } catch (error) {
    console.error('[DB] Erro ao persistir flow interaction:', error.message);
    throw error;
  }
}

/**
 * Atualiza um pedido com dados coletados do Flow
 */
async function updateOrderFromFlow(orderId, flowData) {
  const {
    delivery_type,
    address,
    payment_type,
    customer_notes
  } = flowData;
  
  if (!orderId) {
    console.warn('[DB] orderId não fornecido para update');
    return null;
  }
  
  try {
    const updateData = {};
    
    // Atualizar delivery_type se fornecido
    if (delivery_type) {
      updateData.delivery_type = delivery_type;
    }
    
    // Atualizar endereço de entrega se fornecido
    if (address) {
      updateData.delivery_address = address;
    }
    
    // Atualizar forma de pagamento se fornecida
    if (payment_type) {
      updateData.payment_type = payment_type;
    }
    
    // Atualizar observações se fornecidas
    if (customer_notes) {
      updateData.customer_notes = customer_notes;
    }
    
    // Se há algo para atualizar
    if (Object.keys(updateData).length === 0) {
      console.warn('[DB] Nenhum dado para atualizar no pedido');
      return null;
    }
    
    const result = await db('whatsapp_orders')
      .where('id', orderId)
      .update(updateData);
    
    console.log(`[DB] Order ${orderId} atualizada com dados do Flow`);
    return result;
  } catch (error) {
    console.error('[DB] Erro ao atualizar order com flow data:', error.message);
    throw error;
  }
}

/**
 * Valida se o flow_token pertence ao usuário correto
 * Previne que um usuário use flow_token de outro
 */
async function validateFlowTokenOwnership(flowToken, userId, phoneNumber) {
  try {
    // Se for token "unused" (template), permitir na primeira vez
    if (flowToken === 'unused' || !flowToken) {
      console.log(`[Security] Token "unused" ou vazio - permitindo (primeira interação)`);
      return { valid: true, flowSessionData: null };
    }

    // Buscar a sessão do flow_token no DB
    const flowSessionData = await getFlowSessionByToken(flowToken);
    
    if (!flowSessionData) {
      console.warn(`[Security] ⚠️ Flow token não encontrado no DB: ${flowToken}`);
      await logSecurityEvent('token_not_found', userId, phoneNumber, {
        flowToken,
        timestamp: new Date().toISOString(),
      });
      return { valid: false, flowSessionData: null };
    }
    
    // Validar que o user_id bate
    if (flowSessionData.user_id !== userId) {
      console.error(`[Security] ❌ VIOLAÇÃO DETECTADA: Flow token ${flowToken} pertence a user ${flowSessionData.user_id}, mas requisição veio de user ${userId}`);
      
      // Registrar tentativa suspeita
      await logSecurityEvent('token_hijack_attempt', userId, phoneNumber, {
        flowToken,
        tokenOwnerUserId: flowSessionData.user_id,
        attemptedUserId: userId,
        timestamp: new Date().toISOString(),
      });
      
      return { valid: false, flowSessionData: null };
    }
    
    console.log(`[Security] ✅ Flow token validado para user ${userId}`);
    return { valid: true, flowSessionData };
  } catch (error) {
    console.error(`[Security] Erro ao validar flow_token:`, error.message);
    return { valid: false, flowSessionData: null };
  }
}

/**
 * Registra eventos de segurança (tentativas suspeitas, violações, etc)
 */
async function logSecurityEvent(eventType, userId, phoneNumber, details) {
  try {
    await db('security_audit_log').insert({
      event_type: eventType,
      user_id: userId || null,
      phone_number: phoneNumber || null,
      details: JSON.stringify(details),
      created_at: db.fn.now(),
    });
    
    console.log(`[Audit] Evento registrado: ${eventType} - User: ${userId}, Phone: ${phoneNumber}`);
  } catch (error) {
    console.error('[Audit] Erro ao registrar evento de segurança:', error.message);
    // Não falhar a requisição se log falhar
  }
}

export {
  extractTextFromMessage,
  extractMediaFromMessage,
  parseWebhookPayload,
  persistParsedWebhook,
  getUserIdByIdentifier,
  persistUserIdentification,
  persistMessage,
  persistInteraction,
  persistOrder,
  persistOrderItems,
  persistFlowSession,
  getFlowSessionByToken,
  updateFlowSessionStatus,
  persistFlowInteraction,
  updateOrderFromFlow,
  validateFlowTokenOwnership,
  logSecurityEvent,
};
