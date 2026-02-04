'use strict';

require('dotenv').config();

import { buildKnexConfig } from './config/knex.js';

// O Knex CLI procura por `knexfile.js`. Exportamos a mesma config
// para dev/prod por simplicidade (controlada por variáveis de ambiente).
export const development = buildKnexConfig();
export const production = buildKnexConfig();
