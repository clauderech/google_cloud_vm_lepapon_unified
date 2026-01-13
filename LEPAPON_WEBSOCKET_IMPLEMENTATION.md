# 🚀 Implementação: WebSocket LePapon com Sincronização em Tempo Real

## Resumo Executivo

Implementado fluxo **bidirecional e híbrido (Opção C)** que integra pedidos do servidor LePapon direto no sistema POS da Lanchonete. WebSocket notifica em tempo real, API fornece dados completos, pedidos LePapon aparecem como "Comandas Virtuais" no frontend.

---

## 📋 Arquivos Criados

### Backend

#### 1. **backend/websocket/frontendBroadcaster.js**
- Servidor WebSocket na porta 3002 (configurável via `BROADCASTER_PORT`)
- Mantém conexões de clientes frontend conectados
- Broadcast de eventos `new_lepapon_order` quando novo pedido chega
- Keepalive com ping/pong a cada 30s
- Suporta reconexão automática do cliente com backoff exponencial

**Métodos principais:**
- `start()` - Inicia servidor WS
- `broadcastNewOrder(orderId, orderData)` - Notifica novo pedido
- `broadcastOrderStatusUpdate(orderId, status)` - Notifica mudança de status
- `stop()` - Encerra gracefully
- `getStatus()` - Retorna saúde do servidor

#### 2. **backend/websocket/tokenManager.js**
- Gerencia autenticação com servidor LePapon
- Suporta token via env var `WS_AUTH_TOKEN` ou fetch dinâmico
- Cacheia token com refresh automático antes de expirar
- Mascarar token em logs para segurança

**Métodos principais:**
- `getToken()` - Obtém token (env ou fetch)
- `fetchToken()` - Faz fetch do `WS_TOKEN_ENDPOINT`
- `maskToken(token)` - Mascarar para logs seguros

#### 3. **backend/websocket/lepaponWebSocketClient.js**
- Cliente WebSocket que se conecta em `ws://lepapon.com.br:3001` (configurável)
- Autenticação automática com token
- Reconexão automática com backoff exponencial (5s-60s)
- Processa eventos `new_order` do LePapon
- Máximo 10 tentativas de reconexão

**Métodos principais:**
- `connect()` - Conecta ao servidor LePapon
- `handleMessage(data)` - Processa mensagens
- `scheduleReconnect()` - Agenda reconexão com backoff
- `isConnected()` - Verifica status
- `getStatus()` - Retorna informações de conexão

#### 4. **backend/websocket/orderProcessor.js**
- Processa eventos `new_order` do payload LePapon
- Extrai dados: `pedidosIds[0]`, `itensPedido`, `valorTotal`, `session_id`
- Enfileira processamento para não bloquear WebSocket
- `persistOrderFromLepapon()` salva no BD:
  - Cria/busca usuário com `lepapon_session_id` como telefone
  - INSERT em `whatsapp_orders` com `source='lepapon'`, `status='pending'`
  - INSERT em `whatsapp_order_items` com itens do pedido
  - Notifica broadcaster para enviar ao frontend

**Métodos principais:**
- `processNewOrder(payload)` - Processa novo pedido
- `persistOrderFromLepapon(orderData)` - Salva no BD
- `findOrCreateUserBySession(sessionId)` - Gerencia usuário LePapon

#### 5. **backend/routes/lepapon-orders.js**
- Rota `GET /api/lepapon-orders` - Lista pedidos LePapon
  - Query params: `status`, `since`, `limit`
  - Retorna array de objetos formatados como **Comanda** para frontend
  - Inclui itens do pedido
- Rota `PUT /api/lepapon-orders/:orderId` - Atualiza status
  - Body: `{status, payment_status, payment_type}`
  - Atualiza apenas BD, sem reverse callback ao LePapon

#### 6. **backend/app.js** (Atualizado)
- Importa e inicializa todos os módulos WebSocket
- `FrontendBroadcaster` startup na porta 3002
- `LePaponWebSocketClient` conecta ao servidor LePapon
- Cria `AsyncQueue` para processar pedidos
- Rota `/api/websocket/status` para monitorar saúde
- Graceful shutdown com SIGTERM

#### 7. **migrations/20260113_add_lepapon_fields_to_orders.js**
- Adiciona campos a `whatsapp_orders`:
  - `source` (varchar 50, default 'whatsapp') - origem do pedido
  - `lepapon_order_id` (bigint nullable) - ID do pedido no LePapon
  - `lepapon_session_id` (varchar 50 nullable) - session_id do cliente

#### 8. **migrations/20260113_add_lepapon_fields_to_users.js**
- Adiciona campo a `whatsapp_users`:
  - `lepapon_session_id` (varchar 50 nullable) - session_id único do cliente LePapon

---

### Frontend

#### 1. **frontend/hooks/useLepaponOrders.ts**
- Hook React para sincronizar pedidos LePapon
- Conecta ao WebSocket em `ws://localhost:3002` (configurável)
- Recebe evento `new_lepapon_order`, dispara fetch de API
- Polling a cada 5s (configurável) via `setInterval`
- Mantém estado local de pedidos com `setOrders()`
- Reconexão automática com timeout de 5s

**Interface retornada:**
```typescript
{
  orders: LepaponOrder[],
  isConnected: boolean,
  isLoading: boolean,
  error: string | null,
  fetchLepaponOrders(): Promise<void>,
  updateOrderStatus(orderId, status, paymentStatus?): Promise<boolean>,
  connectWebSocket(): void
}
```

#### 2. **frontend/components/LepaponOrdersTab.tsx**
- Componente React para renderizar aba "Pedidos LePapon"
- Usa hook `useLepaponOrders`
- Exibe lista de pedidos com status visual
- Cards com:
  - ID do pedido
  - Status (pending, confirmed, processing, ready)
  - Telefone/Session ID do cliente
  - Itens do pedido (primeiros 3 + contador)
  - Total em R$
  - Timestamp
  - Botão "Confirmar" para pedidos pendentes
- Status de conexão WebSocket (conectado/desconectado)

#### 3. **frontend/types.ts** (Atualizado)
- Estendeu tipo `Comanda`:
  - `source?: ComandaSource` - 'pos' | 'lepapon'
  - `lepapon_session_id?: string`
  - `lepapon_order_id?: number`
  - `order_status?: string`
  - `payment_status?: string`

#### 4. **frontend/App.tsx** (Atualizado)
- Adicionado import de `LepaponOrdersTab`
- Estendido state da aba: `'quick' | 'comandas' | 'lepapon'`
- Handlers adicionais:
  - `handleSelectLepaponOrder(lepaponComanda)` - Seleciona pedido LePapon
  - `handleUpdateLepaponOrder(orderId, status)` - Callback após atualizar
- Terceira aba renderiza `LepaponOrdersTab` com props

---

## 🔄 Fluxo Completo de Sincronização

```
1. SERVIDOR LEPAPON
   └─ Cliente LePapon faz novo pedido
   └─ Servidor envia WebSocket com payload:
      {
        event: "new_order",
        type: "custom_payload",
        timestamp: "2026-01-13T...",
        data: {
          session_id: "555496860055",
          novo: {
            pedidosIds: [789],
            itensPedido: [{id: 10101, Qtde: 1, ...}],
            valorTotal: 22,
            ...
          }
        }
      }

2. BACKEND (Node.js)
   ├─ lepaponWebSocketClient recebe evento
   ├─ handleMessage() dispara orderProcessor.processNewOrder()
   ├─ Enfileira em asyncQueue (concurrency: 2)
   ├─ persistOrderFromLepapon():
   │  ├─ Cria/busca user com session_id='555496860055'
   │  ├─ INSERT whatsapp_orders (source='lepapon', status='pending')
   │  ├─ INSERT whatsapp_order_items
   │  └─ broadcaster.broadcastNewOrder(orderId)
   └─ FrontendBroadcaster envia event_type='new_lepapon_order'

3. FRONTEND (React)
   ├─ useLepaponOrders recebe WebSocket event
   ├─ triggerFetchLepaponOrders() via GET /api/lepapon-orders
   ├─ API retorna array de Comanda formatadas
   ├─ setOrders() atualiza estado local
   └─ LepaponOrdersTab re-renderiza com novo pedido

4. USUÁRIO NO POS
   ├─ Visualiza novo pedido na aba "Pedidos LePapon"
   ├─ Clica no pedido → handleSelectLepaponOrder()
   ├─ Pedido carregado como Comanda virtual
   ├─ Pode finalizar venda como comanda normal
   ├─ closeComanda() → PUT /api/lepapon-orders/:orderId {status: 'confirmed'}
   └─ BD atualizado (order_status='confirmed')
```

---

## 🔧 Configuração de Variáveis de Ambiente

### Backend
```bash
# WebSocket LePapon
WS_URL=ws://lepapon.com.br:3001              # URL do servidor LePapon
WS_AUTH_TOKEN=seu_token_aqui                  # Token de autenticação (env var)
WS_TOKEN_ENDPOINT=https://lepapon.com.br/api/websocket/token  # Endpoint de token
WS_CONNECTION_INFO_ENDPOINT=https://lepapon.com.br/api/websocket/connection

# Frontend Broadcaster
BROADCASTER_PORT=3002                          # Porta do servidor WS para frontend

# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=lepapon_unified_db
```

### Frontend
```bash
# Pode ser configurado via hook options, defaults:
VITE_API_URL=/api                             # API backend
VITE_WS_URL=ws://localhost:3002               # WebSocket broadcaster
```

---

## 🚀 Como Executar

### 1. **Rodar Migrations**
```bash
cd backend
npx knex migrate:latest
```

### 2. **Instalar Dependências**
```bash
# Backend
cd backend
npm install ws

# Frontend (já inclusos)
cd frontend
npm install
```

### 3. **Iniciar Backend**
```bash
cd backend
npm start
# ou
node app.js
```

**Esperado:**
```
[SERVER] Iniciado em porta 3000
[Broadcaster] WebSocket iniciado na porta 3002
[LePapon] Cliente WebSocket inicializado
[LePapon] Conectado ao servidor LePapon
```

### 4. **Iniciar Frontend**
```bash
cd frontend
npm run dev
```

### 5. **Testar**
- Abrir POS (http://localhost:5173)
- Aba "Pedidos LePapon" mostra `Desconectado` até backend estar pronto
- Quando conectado: muda para `Conectado` (verde)
- Simular novo pedido LePapon → aparece em tempo real
- Clicar no pedido → abre como Comanda virtual
- Finalizar venda → status muda para 'confirmed' no BD

---

## 📊 Status da Conexão

**Rota de Monitoramento:**
```bash
GET /api/websocket/status
```

**Resposta:**
```json
{
  "success": true,
  "broadcaster": {
    "isRunning": true,
    "port": 3002,
    "connectedClients": 1,
    "timestamp": "2026-01-13T..."
  },
  "lepaponClient": {
    "isConnected": true,
    "wsUrl": "ws://lepapon.com.br:3001",
    "reconnectAttempts": 0,
    "state": 1
  }
}
```

---

## ⚠️ Próximos Passos

1. **Testar com servidor LePapon real** - Validar payload
2. **Ajustar mapeamento de usuário** - Se session_id não é exatamente telefone
3. **Integração de Pagamento** - Quando pedido é finalizado
4. **Notificações ao Cliente** - Enviar atualização de status via WhatsApp
5. **Sincronização Reversa (Opcional)** - Notificar LePapon que pedido foi processado

---

## 🎯 Recursos Implementados

✅ WebSocket servidor para notificar frontend  
✅ WebSocket cliente para conectar a LePapon  
✅ Autenticação com token (env var + fetch dinâmico)  
✅ Reconexão automática com backoff exponencial  
✅ Persistência em BD com migrations  
✅ API REST para listar e atualizar pedidos  
✅ Hook React para sincronização em tempo real  
✅ Componente visual de pedidos  
✅ Integração no POS como terceira aba  
✅ Identificação de cliente via session_id  
✅ Status inicial do pedido: 'pending'  
✅ Logging estruturado em todos módulos  
✅ Graceful shutdown do backend  

---

**Data de Implementação:** 13 de janeiro de 2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para teste
