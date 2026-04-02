
const knex = require('knex');

function parseBoolean(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function buildKnexConfig() {
  // DEBUG: Log das variáveis de ambiente para verificar se .env está carregado
  console.log('[KNEX][DEBUG] === VARIÁVEIS DE AMBIENTE ===');
  console.log('[KNEX][DEBUG] DB_CLIENT:', process.env.DB_CLIENT);
  console.log('[KNEX][DEBUG] DB_HOST:', process.env.DB_HOST);
  console.log('[KNEX][DEBUG] DB_PORT:', process.env.DB_PORT);
  console.log('[KNEX][DEBUG] DB_USER:', process.env.DB_USER);
  console.log('[KNEX][DEBUG] DB_PASSWORD:', process.env.DB_PASSWORD ? '***DEFINIDA***' : 'UNDEFINED');
  console.log('[KNEX][DEBUG] DB_NAME:', process.env.DB_NAME);
  console.log('[KNEX][DEBUG] DATABASE_URL:', process.env.DATABASE_URL ? '***DEFINIDA***' : 'UNDEFINED');
  console.log('[KNEX][DEBUG] NODE_ENV:', process.env.NODE_ENV);
  console.log('[KNEX][DEBUG] ==========================================');

  // MySQL por padrão (conforme seu ambiente)
  const client = process.env.DB_CLIENT || 'mysql2';

  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  const baseConnection = hasDatabaseUrl
    ? process.env.DATABASE_URL
    : {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT ? Number.parseInt(process.env.DB_PORT, 10) : 3306,
        user: process.env.DB_USER || undefined,
        password: process.env.DB_PASSWORD || undefined,
        database: process.env.DB_NAME || undefined,
      };

  // DEBUG: Log da conexão final (sem senha)
  console.log('[KNEX][DEBUG] === CONFIGURAÇÃO FINAL ===');
  console.log('[KNEX][DEBUG] client:', client);
  console.log('[KNEX][DEBUG] hasDatabaseUrl:', hasDatabaseUrl);
  if (typeof baseConnection === 'object') {
    console.log('[KNEX][DEBUG] connection:', {
      host: baseConnection.host,
      port: baseConnection.port,
      user: baseConnection.user,
      password: baseConnection.password ? '***PRESENTE***' : 'AUSENTE',
      database: baseConnection.database
    });
  }

  const sslEnabled = parseBoolean(process.env.DB_SSL);
  const sslRejectUnauthorized = !parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED_FALSE);

  const connection =
    typeof baseConnection === 'string'
      ? baseConnection
      : {
          ...baseConnection,
          ...(sslEnabled
            ? {
                ssl: {
                  rejectUnauthorized: sslRejectUnauthorized,
                },
              }
            : null),
        };

  const config = {
    client,
    connection,
    pool: {
      min: process.env.DB_POOL_MIN ? Number.parseInt(process.env.DB_POOL_MIN, 10) : 0,
      max: process.env.DB_POOL_MAX ? Number.parseInt(process.env.DB_POOL_MAX, 10) : 10,
    },
    migrations: {
      tableName: process.env.DB_MIGRATIONS_TABLE || 'knex_migrations',
      directory: process.env.DB_MIGRATIONS_DIR || '../migrations',
    },
  };

  console.log('[KNEX][DEBUG] === CONFIG FINAL COMPLETA ===');
  console.log('[KNEX][DEBUG]', JSON.stringify({
    ...config,
    connection: typeof config.connection === 'string' 
      ? '***DATABASE_URL***' 
      : {
          ...config.connection,
          password: config.connection?.password ? '***OCULTA***' : 'AUSENTE'
        }
  }, null, 2));
  console.log('[KNEX][DEBUG] =====================================');

  return config;
}


const db = knex(buildKnexConfig());

module.exports = { db, buildKnexConfig };
