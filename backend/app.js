'use strict';

// Carregar .env do caminho absoluto do servidor
require('dotenv').config({ path: '/var/www/google_cloud_vm_lepapon_unified/.env' });

import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import knex from 'knex';

// Importar config
import { buildKnexConfig } from './config/knex.js';

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Iniciar cliente WebSocket para eventos new_order
try {
  const { createWebSocketClient } = require('./services/wsNewOrderClient');
  createWebSocketClient();
  console.log('[WS] Cliente WebSocket new_order iniciado');
} catch (err) {
  console.error('[WS] Falha ao iniciar cliente WebSocket:', err.message);
}

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(json({ limit: '10mb' }));
app.use(urlencoded({ limit: '10mb', extended: true }));

// Inicializar banco de dados
let db;
try {
  // LOG TEMPORÁRIO PARA DEBUG DO .ENV
  console.log('DEBUG ENV: NODE_ENV =', process.env.NODE_ENV);
  console.log('DEBUG ENV: WHATSAPP_FLOW_PRIVATE_KEY_PATH =', process.env.WHATSAPP_FLOW_PRIVATE_KEY_PATH);
  // FIM DO LOG TEMPORÁRIO
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
// Rotas de produtos
import productsRouter from './routes/products';
app.use('/api/products', productsRouter);
// Rotas de fornecedores
import suppliersRouter from './routes/suppliers';
app.use('/api/suppliers', suppliersRouter);
// Rotas de clientes
import customersRouter from './routes/customers';
app.use('/api/customers', customersRouter);
// Rotas de vendas
import salesRouter from './routes/sales';
app.use('/api/sales', salesRouter);
// Rotas de compras
import purchasesRouter from './routes/purchases';
app.use('/api/purchases', purchasesRouter);

// Rotas de caixa
import cashRegisterRouter from './routes/cashRegister';
app.use('/api/cash-register', cashRegisterRouter);
// Rotas de comandas
import comandasRouter from './routes/comandas';
app.use('/api/comandas', comandasRouter);
// Rota de estado inicial
import initialStateRouter from './routes/initialState';
app.use('/api/initial-state', initialStateRouter);

// Rotas de cozinha
import cozinhaRouter from './routes/cozinha';
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

export default app;
