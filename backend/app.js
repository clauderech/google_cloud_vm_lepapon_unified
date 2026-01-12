'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const knex = require('knex');

// Importar config
const { buildKnexConfig } = require('./config/knex');
const { validateEnvironment } = require('./config/validateEnv');

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

module.exports = app;
