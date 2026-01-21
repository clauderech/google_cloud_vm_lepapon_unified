'use strict';

/**
 * Migration: Criar tabela de usuários do sistema
 * Autenticação, roles e permissões
 */

exports.up = async function(knex) {
  await knex.schema.createTable('users', (table) => {
    table.string('id', 50).primary();
    table.string('username', 100).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255).notNullable();
    table.enum('role', ['admin', 'operador', 'caixa']).defaultTo('caixa').notNullable();
    table.json('permissions').nullable(); // JSON com permissões granulares
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índices para performance
    table.index('username');
    table.index('role');
    table.index('is_active');
    table.index('created_at');
  });

  console.log('[Migration] Tabela users criada com sucesso');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
  console.log('[Migration] Tabela users removida');
};
