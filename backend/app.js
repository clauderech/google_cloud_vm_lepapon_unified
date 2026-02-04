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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`[SERVER] Iniciado em porta ${PORT}`);
  console.log(`[SERVER] Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

