'use strict';

/**
 * Seeder: Criar usuários padrão
 * Popula a tabela users com usuários de demonstração
 */

const User = require('../models/User');

async function seed() {
  try {
    console.log('[Seeder] Iniciando seeder de usuários...');

    // Usuários de demonstração
    const demoUsers = [
      {
        username: 'admin',
        password: 'admin123',
        name: 'Administrador',
        role: 'admin',
      },
      {
        username: 'operador',
        password: 'op123',
        name: 'Operador',
        role: 'operador',
      },
      {
        username: 'caixa',
        password: 'caixa123',
        name: 'Operador de Caixa',
        role: 'caixa',
      },
    ];

    // Verificar e criar usuários
    for (const userData of demoUsers) {
      const existing = await User.findByUsername(userData.username);

      if (!existing) {
        const user = await User.create(userData);
        console.log(`[Seeder] Usuário criado: ${user.username} (${user.role})`);
      } else {
        console.log(`[Seeder] Usuário já existe: ${userData.username}`);
      }
    }

    console.log('[Seeder] Seeder concluído com sucesso');
  } catch (error) {
    console.error('[Seeder] Erro ao executar seeder:', error);
    process.exit(1);
  }
}

module.exports = seed;
