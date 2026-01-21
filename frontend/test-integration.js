#!/usr/bin/env node

/**
 * Script de teste para validar integração Frontend-Backend
 * Testa os endpoints mais críticos
 */

const http = require('http');

const API_URL = 'http://localhost:3000';

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testEndpoint(name, method, path, body = null, expectedStatus = 200) {
  try {
    log(`\n📝 Testando: ${name}`, colors.cyan);
    const response = await makeRequest(method, path, body);
    
    if (response.status === expectedStatus) {
      log(`✅ Sucesso (${response.status})`, colors.green);
      testResults.passed++;
      if (response.data?.data) {
        log(`   Resposta: ${JSON.stringify(response.data.data).substring(0, 100)}...`);
      }
      return response.data;
    } else {
      log(`❌ Falha (esperado ${expectedStatus}, recebido ${response.status})`, colors.red);
      testResults.failed++;
      testResults.errors.push(`${name}: ${response.status}`);
    }
  } catch (error) {
    log(`❌ Erro: ${error.message}`, colors.red);
    testResults.failed++;
    testResults.errors.push(`${name}: ${error.message}`);
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), colors.blue);
  log('🧪 TESTES DE INTEGRAÇÃO - FRONTEND/BACKEND', colors.blue);
  log('='.repeat(60) + '\n', colors.blue);

  // 1. Teste de Login
  log('\n--- AUTENTICAÇÃO ---', colors.yellow);
  
  let loginResponse = null;
  try {
    log('\n📝 Testando: Login com credenciais corretas', colors.cyan);
    const response = await makeRequest('POST', '/api/users/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.status === 200 && response.data.data?.token) {
      log(`✅ Sucesso (${response.status})`, colors.green);
      testResults.passed++;
      loginResponse = response.data.data;
      log(`   Token: ${response.data.data.token.substring(0, 30)}...`);
      log(`   Usuário: ${response.data.data.user.name} (${response.data.data.user.role})`);
    } else {
      log(`❌ Falha`, colors.red);
      testResults.failed++;
      testResults.errors.push('Login: resposta inválida');
    }
  } catch (error) {
    log(`❌ Erro: ${error.message}`, colors.red);
    testResults.failed++;
    testResults.errors.push(`Login: ${error.message}`);
  }

  // 2. Testes com token
  if (loginResponse) {
    log('\n--- ENDPOINTS PROTEGIDOS ---', colors.yellow);

    // Obter usuário atual
    log('\n📝 Testando: GET /api/users/me', colors.cyan);
    try {
      const url = new URL('/api/users/me', API_URL);
      const options = {
        headers: {
          'Authorization': `Bearer ${loginResponse.token}`
        }
      };
      const response = await new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, data });
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      if (response.status === 200) {
        log(`✅ Sucesso (${response.status})`, colors.green);
        testResults.passed++;
        log(`   Usuário: ${response.data.data.name}`);
      } else {
        log(`❌ Falha (${response.status})`, colors.red);
        testResults.failed++;
      }
    } catch (error) {
      log(`❌ Erro: ${error.message}`, colors.red);
      testResults.failed++;
    }

    // Listar comandas
    log('\n📝 Testando: GET /api/comandas', colors.cyan);
    try {
      const url = new URL('/api/comandas', API_URL);
      const options = {
        headers: {
          'Authorization': `Bearer ${loginResponse.token}`
        }
      };
      const response = await new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, data: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, data });
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      if (response.status === 200) {
        log(`✅ Sucesso (${response.status})`, colors.green);
        testResults.passed++;
        const count = Array.isArray(response.data.data) ? response.data.data.length : 0;
        log(`   Comandas encontradas: ${count}`);
      } else {
        log(`❌ Falha (${response.status})`, colors.red);
        testResults.failed++;
      }
    } catch (error) {
      log(`❌ Erro: ${error.message}`, colors.red);
      testResults.failed++;
    }
  }

  // 3. Resumo
  log('\n' + '='.repeat(60), colors.blue);
  log('📊 RESUMO DOS TESTES', colors.blue);
  log('='.repeat(60), colors.blue);
  log(`✅ Sucessos: ${testResults.passed}`, colors.green);
  log(`❌ Falhas: ${testResults.failed}`, colors.red);
  
  if (testResults.errors.length > 0) {
    log('\n⚠️  Erros encontrados:', colors.yellow);
    testResults.errors.forEach(err => log(`   • ${err}`));
  }

  const total = testResults.passed + testResults.failed;
  const percentage = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;
  log(`\n📈 Taxa de sucesso: ${percentage}% (${testResults.passed}/${total})`, colors.cyan);

  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Iniciar testes
log('⏳ Iniciando testes... Certifique-se de que o backend está rodando em localhost:3000\n', colors.yellow);
setTimeout(runTests, 1000);
