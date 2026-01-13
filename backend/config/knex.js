'use strict';

const knex = require('knex');

function parseBoolean(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function buildKnexConfig() {
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

  return {
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
}

const db = knex(buildKnexConfig());

module.exports = {
  db,
  buildKnexConfig,
};
