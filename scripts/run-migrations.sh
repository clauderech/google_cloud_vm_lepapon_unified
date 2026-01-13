#!/bin/bash
# Script para corrigir e completar as migrações

cd /var/www/google_cloud_vm_lepapon_unified/backend

echo "📋 Verificando status das migrações..."
npx knex migrate:status

echo ""
echo "🔄 Executando migrate:latest para completar pendências..."
npx knex migrate:latest

echo ""
echo "✅ Migrações completadas! Verificando..."
npx knex migrate:status
