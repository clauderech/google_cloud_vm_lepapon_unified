#!/usr/bin/env node

'use strict';

require('dotenv').config();

const userSeeder = require('./seeds/userSeeder');

/**
 * Script para executar seeders
 * Uso: node backend/runSeeders.js
 */

async function runSeeders() {
  try {
    console.log('[Seeders] Executando todos os seeders...\n');

    // Executar seeder de usuários
    await userSeeder();

    console.log('\n[Seeders] Todos os seeders foram executados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeders] Erro ao executar seeders:', error);
    process.exit(1);
  }
}

// Executar
runSeeders();
