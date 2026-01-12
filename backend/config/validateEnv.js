'use strict';

/**
 * Validação e logging de variáveis de ambiente
 * Executa na inicialização da aplicação
 */

const REQUIRED_ENV_VARS = [
  // Banco de dados
  'DB_CLIENT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  
  // WhatsApp Flow
  'WHATSAPP_FLOW_PRIVATE_KEY_PATH',
  'WHATSAPP_APP_SECRET',
  
  // WhatsApp API
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
];

const OPTIONAL_ENV_VARS = [
  // Server
  'PORT',
  'NODE_ENV',
  'CORS_ORIGIN',
  
  // Database (com defaults)
  'DATABASE_URL',
  'DB_SSL',
  'DB_SSL_REJECT_UNAUTHORIZED_FALSE',
  'DB_POOL_MIN',
  'DB_POOL_MAX',
  'DB_MIGRATIONS_TABLE',
  'DB_MIGRATIONS_DIR',
  
  // WhatsApp
  'WHATSAPP_GRAPH_VERSION',
  'WHATSAPP_TEMPLATE_NAME',
  'WHATSAPP_TEMPLATE_LANG',
  'WHATSAPP_TEMPLATE_FOOTER_TEXT',
  'WHATSAPP_TEMPLATE_BUTTON_SUBTYPE',
  'WHATSAPP_TEMPLATE_BUTTON_INDEX',
  'WHATSAPP_TEMPLATE_BUTTON_PAYLOAD',
  'WHATSAPP_TEMPLATE_BUTTON_URL_TEXT',
  'WHATSAPP_TEMPLATE_RECIPIENT_TYPE',
  'WHATSAPP_TEXT_RECIPIENT_TYPE',
  'WHATSAPP_OUTBOUND_CONCURRENCY',
  'WHATSAPP_OUTBOUND_MAX',
  
  // Deploy
  'DEPLOY_USER',
  'DEPLOY_HOST',
];

/**
 * Valida e registra o estado das variáveis de ambiente
 */
function validateEnvironment() {
  console.log('\n' + '='.repeat(80));
  console.log('  VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE');
  console.log('='.repeat(80) + '\n');

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Iniciando validação de variáveis de ambiente...\n`);

  // Verificar variáveis obrigatórias
  console.log('📋 VARIÁVEIS OBRIGATÓRIAS:');
  console.log('-'.repeat(80));
  
  let missingRequired = [];
  REQUIRED_ENV_VARS.forEach((varName) => {
    const value = process.env[varName];
    const status = value ? '✅' : '❌';
    const displayValue = value ? (varName.includes('PASSWORD') || varName.includes('TOKEN') || varName.includes('SECRET') || varName.includes('KEY') ? '***' : value.substring(0, 50)) : 'NÃO CONFIGURADA';
    
    console.log(`  ${status} ${varName.padEnd(45)} = ${displayValue}`);
    
    if (!value) {
      missingRequired.push(varName);
    }
  });

  // Verificar variáveis opcionais
  console.log('\n📋 VARIÁVEIS OPCIONAIS:');
  console.log('-'.repeat(80));
  
  OPTIONAL_ENV_VARS.forEach((varName) => {
    const value = process.env[varName];
    const status = value ? '✅' : '⚠️ ';
    const displayValue = value ? (varName.includes('PASSWORD') || varName.includes('TOKEN') || varName.includes('SECRET') || varName.includes('KEY') ? '***' : value.substring(0, 50)) : 'não configurada (com default)';
    
    console.log(`  ${status} ${varName.padEnd(45)} = ${displayValue}`);
  });

  // Variáveis extras (não listadas acima)
  console.log('\n📋 OUTRAS VARIÁVEIS CARREGADAS:');
  console.log('-'.repeat(80));
  
  const allKnownVars = new Set([...REQUIRED_ENV_VARS, ...OPTIONAL_ENV_VARS]);
  const extraVars = Object.keys(process.env).filter(
    key => !allKnownVars.has(key) && !key.includes('npm') && key !== 'PATH'
  );
  
  if (extraVars.length > 0) {
    extraVars.slice(0, 10).forEach((varName) => {
      const value = process.env[varName];
      const displayValue = varName.includes('PASSWORD') || varName.includes('TOKEN') || varName.includes('SECRET') ? '***' : value.substring(0, 50);
      console.log(`  ℹ️  ${varName.padEnd(45)} = ${displayValue}`);
    });
    
    if (extraVars.length > 10) {
      console.log(`  ℹ️  ... e mais ${extraVars.length - 10} variáveis`);
    }
  } else {
    console.log('  (Nenhuma variável extra encontrada)');
  }

  // Resumo e validação final
  console.log('\n' + '='.repeat(80));
  console.log('  RESUMO');
  console.log('='.repeat(80));
  
  console.log(`
  ✅ Obrigatórias configuradas:  ${REQUIRED_ENV_VARS.length - missingRequired.length}/${REQUIRED_ENV_VARS.length}
  ⚠️  Variáveis opcionais:        ${OPTIONAL_ENV_VARS.length}
  ℹ️  Outras variáveis:           ${extraVars.length}
  `);

  // Se houver variáveis obrigatórias faltando
  if (missingRequired.length > 0) {
    console.log('❌ ERRO: Variáveis obrigatórias não configuradas:');
    console.log('-'.repeat(80));
    missingRequired.forEach((varName) => {
      console.log(`  ❌ ${varName}`);
    });
    console.log('\n⚠️  A aplicação pode não funcionar corretamente!');
    console.log('='.repeat(80) + '\n');
    
    return false;
  } else {
    console.log('✅ SUCESSO: Todas as variáveis obrigatórias estão configuradas!');
    console.log('='.repeat(80) + '\n');
    
    return true;
  }
}

module.exports = {
  validateEnvironment,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS,
};
