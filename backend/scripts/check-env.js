#!/usr/bin/env node

/**
 * Script para verificar variáveis de ambiente
 * Uso: node backend/scripts/check-env.js
 */

require('dotenv').config();

const { validateEnvironment } = require('../config/validateEnv');

const isValid = validateEnvironment();

// Sair com código de erro se houver variáveis obrigatórias faltando
if (!isValid) {
  process.exit(1);
}

process.exit(0);
