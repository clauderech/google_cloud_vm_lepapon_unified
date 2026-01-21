#!/usr/bin/env node

'use strict';

/**
 * Script de Teste: Autenticação JWT
 * Testa o fluxo de login e uso de token
 * 
 * Uso: node backend/testAuth.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testAuth() {
  try {
    console.log('🔐 Testando Autenticação JWT\n');
    console.log(`API URL: ${API_URL}\n`);

    // 1. Fazer login
    console.log('1️⃣  Fazendo login com admin...');
    const loginResponse = await axios.post(`${API_URL}/api/users/login`, {
      username: 'admin',
      password: 'admin123',
    });

    const { token, user } = loginResponse.data.data;
    console.log(`✅ Login realizado com sucesso`);
    console.log(`   Usuário: ${user.name} (${user.role})`);
    console.log(`   Token: ${token.substring(0, 30)}...\n`);

    // 2. Usar token para acessar /api/users/me
    console.log('2️⃣  Acessando /api/users/me com token...');
    const meResponse = await axios.get(`${API_URL}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`✅ Dados do usuário obtidos com sucesso`);
    console.log(`   ID: ${meResponse.data.data.id}`);
    console.log(`   Username: ${meResponse.data.data.username}`);
    console.log(`   Role: ${meResponse.data.data.role}\n`);

    // 3. Tentar sem token (deve falhar)
    console.log('3️⃣  Testando acesso SEM token (deve falhar)...');
    try {
      await axios.get(`${API_URL}/api/users/me`);
      console.log('❌ ERRO: Acesso deveria ter sido negado!');
    } catch (error) {
      console.log(`✅ Acesso negado corretamente`);
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${error.response.data.error}\n`);
    }

    // 4. Listar todos os usuários
    console.log('4️⃣  Listando todos os usuários...');
    const listResponse = await axios.get(`${API_URL}/api/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`✅ ${listResponse.data.count} usuários encontrados:`);
    listResponse.data.data.forEach(u => {
      console.log(`   - ${u.username} (${u.name}) [${u.role}]`);
    });
    console.log();

    console.log('🎉 Todos os testes passaram com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante testes:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Erro: Não consegui conectar ao servidor');
      console.error('Certifique-se de que o servidor está rodando em', API_URL);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Executar
testAuth();
