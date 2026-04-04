'use strict';

// Carregar .env do caminho absoluto do servidor
require('dotenv').config({ path: '/var/www/google_cloud_vm_lepapon_unified/.env' });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex');

const { buildKnexConfig } = require('./config/knex');

const app = express();
const PORT = process.env.PORT || 3000;

try {
  const { createWebSocketClient } = require('./services/wsNewOrderClient');
  createWebSocketClient();
  console.log('[WS] Cliente WebSocket new_order iniciado');
} catch (err) {
  console.error('[WS] Falha ao iniciar cliente WebSocket:', err.message);
}

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let db;
try {
  console.log('DEBUG ENV: NODE_ENV =', process.env.NODE_ENV);
  console.log('DEBUG ENV: WHATSAPP_FLOW_PRIVATE_KEY_PATH =', process.env.WHATSAPP_FLOW_PRIVATE_KEY_PATH);
  const knexConfig = buildKnexConfig();
  db = knex(knexConfig);
  console.log('[DB] Conectado ao banco de dados lepapon_unified_db');
} catch (error) {
  console.error('[DB] Erro ao conectar:', error.message);
  process.exit(1);
}

// Validar configurações WhatsApp na inicialização
console.log('\n🚀 INICIANDO SERVIDOR - VALIDAÇÃO DE CONFIGURAÇÕES WHATSAPP');
try {
  const { validateAndLogWhatsAppEnv } = require('./models/whatsappCloudApi');
  validateAndLogWhatsAppEnv();
} catch (err) {
  console.warn('[WHATSAPP_CONFIG] Aviso: Não foi possível validar configurações WhatsApp:', err.message);
}

app.use((req, res, next) => {
  req.db = db;
  next();
});
const productsRouter = require('./routes/products');
app.use('/api/products', productsRouter);
// Rotas de fornecedores
const suppliersRouter = require('./routes/suppliers');
app.use('/api/suppliers', suppliersRouter);
// Rotas de clientes
const customersRouter = require('./routes/customers');
app.use('/api/customers', customersRouter);
// Rotas de vendas
const salesRouter = require('./routes/sales');
app.use('/api/sales', salesRouter);
// Rotas de compras
const purchasesRouter = require('./routes/purchases');
app.use('/api/purchases', purchasesRouter);

// Rotas de caixa
const cashRegisterRouter = require('./routes/cashRegister');
app.use('/api/cash-register', cashRegisterRouter);
// Rotas de comandas
const comandasRouter = require('./routes/comandas');
app.use('/api/comandas', comandasRouter);
// Rota de estado inicial
const initialStateRouter = require('./routes/initialState');
app.use('/api/initial-state', initialStateRouter);

// Rotas de cozinha
const cozinhaRouter = require('./routes/cozinha');
app.use('/api/cozinha', cozinhaRouter);

// Rotas de relatórios
const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

// Rotas de controle de estoque
const stockRouter = require('./routes/stock');
app.use('/api/stock', stockRouter);

// Rotas de produção de insumos caseiros
const productionRouter = require('./routes/production');
app.use('/api/production', productionRouter);
console.log('[APP] Production routes registered at /api/production');

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

// Error handling
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor'
  });
});

// Iniciar servidor com Socket.IO
const http = require('http');
const { configureSocket } = require('./services/socketConfig');

const server = http.createServer(app);

// Configurar Socket.IO para notificações em tempo real
try {
  configureSocket(server);
  console.log('[Socket] Socket.IO configurado para notificações em tempo real');
} catch (err) {
  console.warn('[Socket] Socket.IO não disponível, continuando sem notificações em tempo real:', err.message);
}

// Inicializar Scheduler de Crediário WhatsApp
try {
  const CrediarioScheduler = require('./services/crediarioScheduler');
  const scheduler = CrediarioScheduler.getInstance();
  scheduler.start();
  console.log('[CREDIARIO_SCHEDULER] Scheduler de lembretes WhatsApp iniciado');
} catch (err) {
  console.warn('[CREDIARIO_SCHEDULER] Falha ao iniciar scheduler:', err.message);
}

server.listen(PORT, () => {
  console.log(`[SERVER] Iniciado em porta ${PORT}`);
  console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Socket.IO habilitado para notificações da cozinha`);
});

