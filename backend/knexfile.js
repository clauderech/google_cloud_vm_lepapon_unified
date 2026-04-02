'use strict';

require('dotenv').config();

const { buildKnexConfig } = require('./config/knex.js');

// O Knex CLI procura por `knexfile.js`. Exportamos a mesma config
// para dev/prod por simplicidade (controlada por variáveis de ambiente).
module.exports = {
  development: buildKnexConfig(),
  production: buildKnexConfig()
};
