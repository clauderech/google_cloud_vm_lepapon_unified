
import {
  parseWebhookPayload,
  persistParsedWebhook,
  getUserIdByIdentifier,
  persistUserIdentification,
  persistMessage,
  persistInteraction,
  persistOrder,
  persistFlowSession,
  getFlowSessionByToken,
  updateFlowSessionStatus,
  persistFlowInteraction,
  updateOrderFromFlow,
  validateFlowTokenOwnership,
  logSecurityEvent,
} from '../models/processwhatsapp.js';
import webhookBatcherModule from '../models/webhookBatcher.js';
const { createWebhookBatcher, toInt } = webhookBatcherModule;
import whatsappResponderModule from '../models/whatsappResponder.js';
const { enqueueFirstResponse, enqueueOrderAck } = whatsappResponderModule;
import whatsappFlowModule from '../models/whatsappFlow.js';
const { createFlowProcessor } = whatsappFlowModule;
import whatsappFlowScreensModule from '../models/whatsappFlowScreens.js';
const { createFlowScreenNavigator, CATEGORY_PRODUCTS } = whatsappFlowScreensModule;
import whatsappCloudApiModule from '../models/whatsappCloudApi.js';
const { sendCatalogMessage, sendFlowMessage } = whatsappCloudApiModule;
import asyncQueueModule from '../models/asyncQueue.js';
const { createQueue } = asyncQueueModule;
import sessionStoreModule from '../models/sessionStore.js';
const { createSessionStore } = sessionStoreModule;

const webhookBatcher = createWebhookBatcher({
  persistFn: persistParsedWebhook,
  flushIntervalMs: toInt(process.env.WEBHOOK_BATCH_FLUSH_MS, 250),
  maxBatchSize: toInt(process.env.WEBHOOK_BATCH_MAX_SIZE, 200),
  maxPending: toInt(process.env.WEBHOOK_BATCH_MAX_PENDING, 5000),
  concurrency: toInt(process.env.WEBHOOK_QUEUE_CONCURRENCY, 1),
  maxQueue: toInt(process.env.WEBHOOK_QUEUE_MAX, 1000),
});

// Cache para mapear flowSessionId → phoneNumber
const flowSessionPhoneMap = new Map();

// Limpador periódico do mapa de sessões Flow
const FLOW_SESSION_TIMEOUT = 3600000; // 1 hora
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  
  for (const [flowSessionId, entry] of flowSessionPhoneMap.entries()) {
    if (now - entry.createdAt > FLOW_SESSION_TIMEOUT) {
      flowSessionPhoneMap.delete(flowSessionId);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[Flow] Limpeza: ${removed} mapeamentos de sessão Flow expirados removidos`);
  }
}, 600000); // A cada 10 minutos

const flowProcessor = createFlowProcessor();
const flowNavigator = createFlowScreenNavigator();

// Session store para rastrear usuários
const sessionStore = createSessionStore({
  maxAge: 3600000, // 1 hora
  cleanupInterval: 600000, // 10 minutos
});

// Queue para enviar catálogos
const catalogQueue = createQueue({
  concurrency: toInt(process.env.WHATSAPP_CATALOG_CONCURRENCY || 2, 2),
  maxSize: toInt(process.env.WHATSAPP_CATALOG_MAX || 500, 500),
});

// Queue para disparar flows de pedidos
const orderFlowQueue = createQueue({
  concurrency: toInt(process.env.WHATSAPP_ORDER_FLOW_CONCURRENCY || 2, 2),
  maxSize: toInt(process.env.WHATSAPP_ORDER_FLOW_MAX || 500, 500),
});

// Cache temporário para chaves de Flow (válido apenas para a requisição)
let flowEncryptionCache = null;

function handleVerifyWebhook(req, res) {
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
    const xHubSignature = req.headers['x-hub-signature-256'];

    // Debug: Log do payload completo recebido
    console.log("[DEBUG] Payload completo recebido:", JSON.stringify(body, null, 2));

    // Verificar se é um evento de Flow
    if (body.encrypted_flow_data) {
      try {
        // Armazenar chaves para encriptação da resposta
        flowEncryptionCache = {
          aesKey: flowProcessor.getDecryptedAesKey(body.encrypted_aes_key),
          initialVector: Buffer.from(body.initial_vector, 'base64')
        };

        const flowResult = flowProcessor.processFlowWebhook(body, xHubSignature);
        console.log('[Flow] Processado com sucesso:', flowResult.data);
        
        // ===== BUSCAR SESSÃO DE FLOW USANDO flow_token =====
        let flowToken = flowResult.data.flow_token;
        console.log(`[Flow] Flow token recebido: ${flowToken || 'undefined'}`);
        
        let flowSessionData = null;
        let persistedUserId = null;
        let currentOrderId = null;
        let flowSessionId = null;
        let userPhoneNumber = 'unknown';
        
        // Se flow_token for "unused" (template de teste), gerar um temporário
        if (flowToken === 'unused') {
          console.warn('[Flow] ⚠️ Flow token é "unused" (template de teste) - usando fallback');
          flowToken = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`[Flow] Flow token gerado para teste: ${flowToken}`);
        }
        
        if (flowToken && flowToken !== 'unused') {
          // ===== VALIDAR PROPRIEDADE DO FLOW_TOKEN =====
          // Para flow webhooks criptografados, obter phone/userId do sessionStore (fallback)
          const allSessions = sessionStore.getAllSessions();
          let currentUserId = null;
          let userPhoneFromSession = 'unknown';
          
          if (allSessions.length > 0) {
            const recentSession = allSessions.reduce((latest, current) => 
              current.timestamp > latest.timestamp ? current : latest
            );
            currentUserId = recentSession.userId;
            userPhoneFromSession = recentSession.phoneNumber;
          }
          
          // Validar que o token pertence ao usuário correto
          const { valid: tokenIsValid, flowSessionData: validatedSession } = 
            await validateFlowTokenOwnership(flowToken, currentUserId, userPhoneFromSession);
          
          if (tokenIsValid && validatedSession) {
            // ✅ Token é válido e pertence ao usuário
            flowSessionData = validatedSession;
            persistedUserId = flowSessionData.user_id;
            currentOrderId = flowSessionData.order_id;
            flowSessionId = flowSessionData.flow_session_id;
            userPhoneNumber = userPhoneFromSession;
            
            // Atualizar status da sessão
            await updateFlowSessionStatus(flowToken, 'in_progress');
            
            console.log(`[Flow] ✅ Sessão encontrada e validada: user_id=${persistedUserId}, order_id=${currentOrderId}`);
          } else if (!validatedSession) {
            // ❌ Token não é válido ou pertence a outro usuário
            console.warn(`[Flow] ⚠️ Sessão não encontrada ou token inválido para: ${flowToken}`);
            
            // Se temos userId e token falhou na validação, é suspeito
            if (currentUserId) {
              await logSecurityEvent('token_not_found', currentUserId, userPhoneFromSession, {
                flowToken,
                action: 'flow_processing',
              });
            }
          }
        }
        
        // Se não conseguir recuperar via flow_token, usar fallback (NÃO RECOMENDADO para produção)
        if (!persistedUserId) {
          console.warn('[Flow] ⚠️ Usando fallback de sessão mais recente - INSEGURO para múltiplos usuários');
          const allSessions = sessionStore.getAllSessions();
          if (allSessions.length > 0) {
            const recentSession = allSessions.reduce((latest, current) => 
              current.timestamp > latest.timestamp ? current : latest
            );
            userPhoneNumber = recentSession.phoneNumber;
            persistedUserId = recentSession.userId;
            currentOrderId = recentSession.orderId;
            flowSessionId = recentSession.flowSessionId || `fallback_${Date.now()}`;
            console.log(`[Flow] Fallback: user_phone=${userPhoneNumber}, user_id=${persistedUserId}, flowSessionId=${flowSessionId}`);
          }
        }
        
        // Garantir que flowSessionId existe
        if (!flowSessionId) {
          flowSessionId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log(`[Flow] FlowSessionId gerado: ${flowSessionId}`);
        }
        
        // Determinar o tipo de resposta baseado na ação
        let responsePayload;
        
        if (flowResult.data.action === 'ping') {
          // Health check request
          console.log('[Flow] Respondendo a health check');
          responsePayload = {
            data: {
              status: 'active'
            }
          };
        } else if (flowResult.data.action === 'data_exchange') {
          // Data exchange request - processar ação do usuário e navegar
          console.log('[Flow] Respondendo a data exchange com ação do usuário');
          const userPayloadData = flowResult.data.data || {};
          const userAction = userPayloadData.opcao || 
                             userPayloadData.opt_pedido ||
                             userPayloadData.action || 'start';
          
          // Processar a ação e obter a próxima tela
          responsePayload = flowNavigator.processUserAction(flowSessionId, {
            action: userAction,
            payload: userPayloadData,
          });
          
          // ===== PERSISTIR FLOW INTERACTION =====
          if (persistedUserId) {
            try {
              const flowId = process.env.WHATSAPP_FLOW_ID_PEDIDOS;
              await persistFlowInteraction(persistedUserId, {
                flow_id: flowId,
                flow_name: 'pedidos',
                screen: responsePayload.screen,
                user_input: userPayloadData,
                action: userAction,
              });
            } catch (error) {
              console.error('[Flow] Erro ao persistir interação:', error.message);
            }
          }
          
          // Se é SUCCESS vindo de OPCAO com RETIRAR, confirmar retirada
          if (responsePayload.screen === 'SUCCESS' && userAction === 'RETIRAR' && currentOrderId && persistedUserId) {
            console.log(`[Order] Finalizando pedido RETIRAR para order ${currentOrderId}`);
            
            try {
              // Atualizar order com delivery_type e observações
              await updateOrderFromFlow(currentOrderId, {
                delivery_type: 'pickup',
                customer_notes: userPayloadData.observ || null,
              });
              
              // Marcar flow session como completed - usar flowSessionId como fallback
              if (flowToken || flowSessionId) {
                await updateFlowSessionStatus(flowToken || flowSessionId, 'completed', {
                  delivery_type: 'pickup',
                  notes: userPayloadData.observ,
                });
              }
              
              console.log(`[Order] Pedido ${currentOrderId} atualizado como RETIRADA`);
              
              // AUTOMAÇÃO: Enviar pedido confirmado para cozinha automaticamente
              try {
                const { processWhatsAppOrderToCozinha } = require('../models/processwhatsapp');
                await processWhatsAppOrderToCozinha(currentOrderId);
                console.log(`[Order] Pedido ${currentOrderId} enviado automaticamente para cozinha`);
              } catch (cozinhaError) {
                console.error('[Order] Erro ao enviar pedido para cozinha:', cozinhaError.message);
              }
            } catch (error) {
              console.error('[Order] Erro ao atualizar pedido:', error.message);
            }
          }
          
          // Se é TELE_ENTREGA após OPCAO, guardar observações na tela
          if (responsePayload.screen === 'TELE_ENTREGA_FORM' && userPayloadData.observ) {
            console.log(`[Order] Usuário ${userPhoneNumber} selecionou tele-entrega com observação: ${userPayloadData.observ}`);
            // Adicionar observação aos dados da tela para passar adiante
            responsePayload.data.observacoes = userPayloadData.observ;
          }
          
          // Se é SUCCESS vindo de TELE_ENTREGA_FORM, confirmar entrega
          if (responsePayload.screen === 'SUCCESS' && userAction === 'confirm_delivery' && currentOrderId && persistedUserId) {
            console.log(`[Order] Finalizando pedido TELE_ENTREGA para order ${currentOrderId}`);
            
            try {
              // Atualizar order com dados de entrega
              await updateOrderFromFlow(currentOrderId, {
                delivery_type: 'delivery',
                address: userPayloadData.endereco || null,
                payment_type: userPayloadData.tipo_pay || userPayloadData.opt_pay || null,
                customer_notes: userPayloadData.observ || null,
              });
              
              // Marcar flow session como completed - usar flowSessionId como fallback
              if (flowToken || flowSessionId) {
                await updateFlowSessionStatus(flowToken || flowSessionId, 'completed', {
                  delivery_type: 'delivery',
                  address: userPayloadData.endereco,
                  payment_type: userPayloadData.tipo_pay || userPayloadData.opt_pay,
                  notes: userPayloadData.observ,
                });
              }
              
              console.log(`[Order] Pedido ${currentOrderId} atualizado como TELE-ENTREGA`);
              
              // AUTOMAÇÃO: Enviar pedido confirmado para cozinha automaticamente
              try {
                const { processWhatsAppOrderToCozinha } = require('../models/processwhatsapp');
                await processWhatsAppOrderToCozinha(currentOrderId);
                console.log(`[Order] Pedido ${currentOrderId} enviado automaticamente para cozinha`);
              } catch (cozinhaError) {
                console.error('[Order] Erro ao enviar pedido para cozinha:', cozinhaError.message);
              }
            } catch (error) {
              console.error('[Order] Erro ao atualizar pedido:', error.message);
            }
          }
          
          // Se é MENU_CATALOGO e usuário selecionou uma categoria, enfileirar catálogo
          if (
            responsePayload.screen === 'MENU_CATALOGO' &&
            userPayloadData.numero_pedido &&
            CATEGORY_PRODUCTS[userPayloadData.numero_pedido] &&
            userPhoneNumber !== 'unknown'
          ) {
            const categoryId = userPayloadData.numero_pedido;
            console.log(`[Flow] Enfileirando catálogo da categoria: ${categoryId} para ${userPhoneNumber}`);
            
            // Atualizar mapeamento com tela atual
            if (flowSessionPhoneMap.has(flowSessionId)) {
              const entry = flowSessionPhoneMap.get(flowSessionId);
              entry.screen = responsePayload.screen;
            }
            
            catalogQueue.enqueue(async () => {
              try {
                const catalogPayload = flowNavigator.generateCatalogTemplatePayload(
                  userPhoneNumber,
                  categoryId
                );
                
                if (catalogPayload) {
                  const result = await sendCatalogMessage(catalogPayload);
                  console.log(`[Flow] Catálogo enviado com sucesso para ${userPhoneNumber}`);
                }
              } catch (error) {
                console.error(`[Flow] Erro ao enviar catálogo:`, error.message);
              }
            });
          } else if (responsePayload.screen === 'MENU_CATALOGO' && userPayloadData.numero_pedido) {
            console.log(`[Flow] ⚠️ Catálogo não será enviado: número de telefone indisponível (${userPhoneNumber}). Implemente forma de capturar número do usuário.`);
          }
          
          // Se é a tela SUCCESS, adicionar o token para retorno à Meta
          if (responsePayload.screen === 'SUCCESS') {
            // Usar o flowSessionId que foi gerado quando o pedido foi criado
            const tokenToReturn = flowSessionId || flowResult.data.flow_token || 'unknown';
            responsePayload.data.response_json = {
              flow_token: tokenToReturn,
              action: userAction,
            };
            console.log(`[Flow] ✅ Resposta SUCCESS com flow_token: ${tokenToReturn}`);
          }
        } else {
          // Ação desconhecida - iniciar fluxo
          console.log('[Flow] Ação desconhecida:', flowResult.data.action);
          responsePayload = flowNavigator.startFlow(flowSessionId);
        }
        
        // Encriptar a resposta
        const encryptedResponse = flowProcessor.encryptFlowResponse(
          responsePayload, 
          flowEncryptionCache.aesKey, 
          flowEncryptionCache.initialVector
        );
        
        console.log('[Flow] Resposta encriptada enviada');
        
        res.set('Content-Type', 'text/plain');
        return res.status(200).send(encryptedResponse);
      } catch (error) {
        console.error('[Flow] Erro ao processar:', error.message);
        console.error('[Flow] Stack:', error.stack);
        return res.status(400).send('FLOW_ERROR');
      }
    }

    // Processar evento normal de WhatsApp
    if (!body || body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    const { messages, statuses } = parseWebhookPayload(body);

    // Processar mensagens
    for (const message of messages) {
      if (!message) continue;
      
      const {
        primary_identifier: userId,
        identification_source: idSource,
        business_scoped_user_id,
        phone_number,
        username,
        contact_name,
        type: messageType,
        order: orderData,
      } = message;
      
      console.log(`[Webhook] Mensagem recebida de ${userId} (via ${idSource})`);
      
      // Variáveis para armazenar dados da order (escopo do try)
      let orderId = null;
      let flowSessionId = null;
      
      try {
        // 1️⃣ PERSISTIR USER IDENTIFICATION
        const persistedUserId = await persistUserIdentification({
          business_scoped_user_id,
          phone_number,
          username,
          contact_name,
          identification_source: idSource,
        });
        
        if (!persistedUserId) {
          console.warn(`[Webhook] Falha ao persistir user, pulando mensagem`);
          continue;
        }
        
        // 2️⃣ PERSISTIR MENSAGEM
        await persistMessage(persistedUserId, message);
        
        // 2.5️⃣ SE FOR INTERATIVA, PERSISTIR INTERAÇÃO
        if (messageType === 'interactive' && message?.interactive) {
          await persistInteraction(persistedUserId, message);
        }
        
        // 3️⃣ SE FOR ORDER, PERSISTIR PEDIDO
        if (messageType === 'order' && orderData) {
          const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          flowSessionId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log(`[Order] Persistindo pedido de ${userId} com ${orderData.product_items?.length || 0} item(ns)`);
          
          orderId = await persistOrder(persistedUserId, {
            order_number: orderNumber,
            catalog_id: orderData.catalog_id,
            product_items: orderData.product_items,
            delivery_type: 'pickup',
            source_message_wa_id: message.id,
          });
          
          // Criar sessão de Flow para ratrear este pedido
          // O flow_token será gerado pelo WhatsApp e retornará neste flowSessionId
          if (orderId) {
            try {
              await persistFlowSession(persistedUserId, orderId, flowSessionId, flowSessionId);
              console.log(`[Flow] Sessão criada para order ${orderId}: ${flowSessionId}`);
            } catch (error) {
              console.error(`[Flow] Erro ao criar sessão: ${error.message}`);
            }
          }
          
          // Armazenar orderId e flowSessionId na sessão para usar no flow
          const sessionKey = userId;
          const currentSession = sessionStore.getSession(sessionKey) || {};
          sessionStore.updateSession(sessionKey, {
            ...currentSession,
            orderId,
            flowSessionId,
          });
          
          console.log(`[Order] Pedido ${orderId} persistido com sucesso`);
        }
        
        // 4️⃣ ATUALIZAR SESSION (agora com userId do DB)
        const orderItems = messageType === 'order'
          ? (Array.isArray(orderData?.product_items) ? orderData.product_items : [])
          : [];
        
        const sessionKey = userId; // Usar primaryId em vez de phoneNumber
        const session = sessionStore.getSession(sessionKey);
        
        if (!session) {
          sessionStore.setSession(sessionKey, {
            userId: persistedUserId,
            phoneNumber: phone_number,
            messageType,
            orderItems,
            ...(messageType === 'order' && { 
              orderId: orderId,
              flowSessionId: flowSessionId 
            }),
          });
          console.log(`[SessionStore] Nova sessão criada para ${sessionKey} (user_id: ${persistedUserId})`);
        } else {
          sessionStore.updateSession(sessionKey, {
            userId: persistedUserId,
            lastMessage: message,
            lastMessageTime: Date.now(),
            ...(orderItems.length > 0 && { orderItems }),
            ...(messageType === 'order' && { 
              orderId: orderId,
              flowSessionId: flowSessionId 
            }),
          });
          console.log(`[SessionStore] Sessão atualizada para ${sessionKey}`);
        }
      } catch (error) {
        console.error(`[Webhook] Erro ao processar mensagem:`, error.message);
        // Continuar processando outras mensagens
      }
    }

    // Processar statuses (entrega, leitura)
    for (const status of statuses) {
      // TODO: Atualizar status de mensagem em whatsapp_messages
      console.log(`[Webhook] Status ${status.status} para mensagem ${status.id}`);
    }

    const result = webhookBatcher.add({ messages, statuses });
    if (!result.accepted) {
      console.warn('[webhook] batcher não aceitou; retornando 503', result);
      return res.status(503).set('Retry-After', '2').send('QUEUE_FULL');
    }

    // Enfileirar actions baseado no tipo de mensagem
    for (const message of messages) {
      if (!message?.id) continue;

      const phoneNumber = message.from;
      const userId = message.primary_identifier; // Recuperar userId do message
      const messageType = message.type;

      // Se for uma mensagem de order, disparar flow de pedido
      if (messageType === 'order' && message.order?.product_items) {
        const items = message.order.product_items;
        const sessionKey = userId; // Usar userId como chave, não phoneNumber
        const userSession = sessionStore.getSession(sessionKey);
        const flowSessionId = userSession?.flowSessionId;
        
        console.log(`[Order] Enfileirando flow 'pedidos' para ${phoneNumber} com ${items.length} item(ns)`);
        console.log(`[Order] Flow token: ${flowSessionId}`);
        
        // Enfileirar disparo do flow de pedido
        orderFlowQueue.enqueue(async () => {
          try {
            const { sendFlowMessage } = require('../models/whatsappCloudApi');
            const flowId = process.env.WHATSAPP_FLOW_ID_PEDIDOS;

            if (!flowId) {
              console.error('[Order] ❌ WHATSAPP_FLOW_ID_PEDIDOS não configurado');
              console.error('[Order] Configure a variável de ambiente com o ID do seu flow');
              return;
            }

            console.log(`[Order] Enviando flow para ${phoneNumber}`);
            console.log(`[Order]   - Flow ID: ${flowId}`);
            console.log(`[Order]   - Flow Token: ${flowSessionId}`);
            
            await sendFlowMessage({
              to: phoneNumber,
              flowId,
              flowToken: flowSessionId,
            });
            
            console.log(`[Order] ✅ Flow enviado com sucesso para ${phoneNumber}`);
          } catch (error) {
            console.error(`[Order] ❌ Erro ao enviar flow para ${phoneNumber}:`, error.message);
          }
        });
      } else {
        // Mensagens normais
        const queued = enqueueFirstResponse({ waMessageId: message.id, to: phoneNumber });

        if (!queued.accepted) {
          console.warn('[whatsapp] outbound queue cheia', queued);
        }
      }
    }

    // Responde rápido; persistência de users/mensagens/orders já aconteceu acima
    return res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('Erro no POST /webhook:', error);
    return res.sendStatus(500);
  }
}

export {
  handleVerifyWebhook,
  handleWebhookEvent,
};
