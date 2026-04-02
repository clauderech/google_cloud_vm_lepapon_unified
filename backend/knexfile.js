'use strict';

require('dotenv').config();

console.log('[KNEXFILE][DEBUG] === CARREGANDO KNEXFILE ===');
console.log('[KNEXFILE][DEBUG] .env carregado, NODE_ENV:', process.env.NODE_ENV);
console.log('[KNEXFILE][DEBUG] Working directory:', process.cwd());

const { buildKnexConfig } = require('./config/knex.js');

// O Knex CLI procura por `knexfile.js`. Exportamos a mesma config
// para dev/prod por simplicidade (controlada por variáveis de ambiente).
const config = {
  development: buildKnexConfig(),
  production: buildKnexConfig()
};

console.log('[KNEXFILE][DEBUG] === CONFIG EXPORTADA ===');
console.log('[KNEXFILE][DEBUG] Config keys:', Object.keys(config));
console.log('[KNEXFILE][DEBUG] ==============================');

module.exports = config;
