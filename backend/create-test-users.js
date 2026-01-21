#!/usr/bin/env node

/**
 * Script rápido para criar usuários de teste
 * Uso: node create-test-users.js
 */

const knex = require('knex');
const path = require('path');
require('dotenv').config();

// Importar config do banco
const knexConfig = require('./knexfile');
const db = knex(knexConfig.development || knexConfig);

// Importar User model
const User = require('./models/User');

async function createTestUsers() {
  try {
    console.log('🔄 Iniciando criação de usuários de teste...\n');

    const testUsers = [
      {
        username: 'admin',
        password: 'admin123',
        name: 'Administrador',
        role: 'admin'
      },
      {
        username: 'operador',
        password: 'operador123',
        name: 'Operador',
        role: 'operador'
      },
      {
        username: 'caixa',
        password: 'caixa123',
        name: 'Operador de Caixa',
        role: 'caixa'
      }
    ];

    for (const userData of testUsers) {
      try {
        // Verificar se já existe
        const existing = await db('users')
          .where('username', userData.username)
          .first();

        if (existing) {
          console.log(`⚠️  Usuário "${userData.username}" já existe`);
          continue;
        }

        // Criar usuário
        const user = await User.create(userData);
        console.log(`✅ Usuário criado: ${user.username} (${user.role})`);
      } catch (error) {
        console.error(`❌ Erro ao criar ${userData.username}:`, error.message);
      }
    }

    console.log('\n✅ Processo concluído');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createTestUsers();
