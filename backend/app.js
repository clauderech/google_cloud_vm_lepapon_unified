'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex');

// Importar config
const { buildKnexConfig } = require('./config/knex');
const { validateEnvironment } = require('./config/validateEnv');

// Importar WebSocket e LePapon
const FrontendBroadcaster = require('./websocket/frontendBroadcaster');
const LePaponWebSocketClient = require('./websocket/lepaponWebSocketClient');
const TokenManager = require('./websocket/tokenManager');
const OrderProcessor = require('./websocket/orderProcessor');
const { createQueue } = require('./models/asyncQueue');

// Importar rotas
const authRoutes = require('./routes/auth');
const lepaponOrdersRoutes = require('./routes/lepapon-orders');
const apiRoutes = require('./routes/api');
const financialRoutes = require('./routes/financial');
const monthlyAccountRoutes = require('./routes/monthly-account');

// Validar variáveis de ambiente na inicialização
validateEnvironment();

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Inicializar banco de dados
let db;
try {
  const knexConfig = buildKnexConfig();
  db = knex(knexConfig);
  console.log('[DB] Conectado ao banco de dados lepapon_unified_db');
} catch (error) {
  console.error('[DB] Erro ao conectar:', error.message);
  process.exit(1);
}

// Middleware para injetar db nas rotas
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'lepapon_unified_db'
  });
});

// Rotas Lanchonete (placeholder)
app.get('/api/lanchonete/health', (req, res) => {
  res.json({ status: 'ok', module: 'lanchonete' });
});

// Rotas de sincronização (placeholder)
app.get('/api/sync/status', (req, res) => {
  res.json({ status: 'ok', module: 'sync' });
});

// Rotas de Autenticação
app.use('/api/auth', authRoutes);

// Rotas LePapon Orders
app.use(lepaponOrdersRoutes);

// Rotas Financeiras (Caixa, Despesas, Ativos)
app.use(financialRoutes);

// Rotas de Crediário Mensal
app.use(monthlyAccountRoutes);

// Rotas de API (Produtos, Estado Inicial)
app.use(apiRoutes);

// Rota de status do WebSocket Broadcaster (para monitoramento)
app.get('/api/websocket/status', (req, res) => {
  if (global.frontendBroadcaster) {
    res.json({
      success: true,
      broadcaster: global.frontendBroadcaster.getStatus(),
      lepaponClient: global.lepaponWebSocketClient ? global.lepaponWebSocketClient.getStatus() : null
    });
  } else {
    res.json({
      success: false,
      error: 'WebSocket broadcaster não inicializado'
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Iniciar servidor e WebSocket
const server = app.listen(PORT, async () => {
  console.log(`[SERVER] Iniciado em porta ${PORT}`);
  console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);

  // Inicializar Frontend Broadcaster (WebSocket para notificar frontend)
  try {
    const broadcasterPort = process.env.WS_PORT || 3003;
    const frontendBroadcaster = new FrontendBroadcaster({
      port: broadcasterPort,
      logger: console
    });

    await frontendBroadcaster.start();
    global.frontendBroadcaster = frontendBroadcaster;
    console.log(`[Broadcaster] WebSocket iniciado na porta ${broadcasterPort}`);
  } catch (error) {
    console.error('[Broadcaster] Erro ao iniciar:', error.message);
  }

  // Inicializar LePapon WebSocket Client
  try {
    const tokenManager = new TokenManager({
      logger: console
    });

    const lepaponQueue = createQueue({
      concurrency: 2,
      maxSize: 500,
      logger: console
    });

    const orderProcessor = new OrderProcessor({
      db,
      broadcaster: global.frontendBroadcaster,
      asyncQueue: lepaponQueue,
      logger: console
    });

    const lepaponWebSocketClient = new LePaponWebSocketClient({
      wsUrl: process.env.WS_URL || 'ws://lepapon.com.br:3001',
      tokenManager,
      orderProcessor,
      logger: console
    });

    await lepaponWebSocketClient.connect();
    global.lepaponWebSocketClient = lepaponWebSocketClient;
    console.log('[LePapon] Cliente WebSocket inicializado');
  } catch (error) {
    console.error('[LePapon] Erro ao inicializar cliente WebSocket:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM recebido, encerrando gracefully...');
  
  if (global.lepaponWebSocketClient) {
    global.lepaponWebSocketClient.close();
  }

  if (global.frontendBroadcaster) {
    await global.frontendBroadcaster.stop();
  }

  server.close(() => {
    console.log('[SERVER] Servidor encerrado');
    process.exit(0);
  });
});

module.exports = app;
