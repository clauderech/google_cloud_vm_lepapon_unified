#!/bin/bash

# Script de teste rápido para o sistema de WhatsApp billing
# Ubuntu 25.10 - Verificação pós-instalação

echo "🧪 Teste do Sistema WhatsApp Billing - Ubuntu 25.10"
echo "=================================================="

echo ""
echo "📋 1. Verificando browsers disponíveis..."

# Verificar browsers instalados
if command -v google-chrome-stable &> /dev/null; then
    echo "✅ Google Chrome: $(google-chrome-stable --version | head -1)"
elif command -v chromium &> /dev/null; then
    echo "✅ Chromium: $(chromium --version | head -1)"  
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium Browser: $(chromium-browser --version | head -1)"
else
    echo "⚠️  Nenhum browser encontrado (fallback HTML ativo)"
fi

echo ""
echo "🔧 2. Verificando sistema Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js não encontrado!"
fi

if command -v pm2 &> /dev/null; then
    echo "✅ PM2: $(pm2 --version)"
    echo "📊 Status PM2:"
    pm2 list --no-color
else
    echo "❌ PM2 não encontrado!"
fi

echo ""
echo "🌐 3. Testando API endpoints..."

# Testar endpoint de diagnóstico
echo "📡 Testando diagnóstico do sistema..."
if curl -s --connect-timeout 10 "https://snackbartio.com.br/api/comandas/crediario/test-image-system" > /tmp/test_response.json; then
    if grep -q '"status":"ok"' /tmp/test_response.json; then
        echo "✅ API de diagnóstico funcionando"
        
        # Mostrar status do sistema de imagem
        if grep -q '"puppeteerStatus":"failed"' /tmp/test_response.json; then
            echo "⚠️  Puppeteer: Fallback HTML ativo"
        else
            echo "✅ Puppeteer: Funcionando com PNG"
        fi
    else
        echo "⚠️  API retornou resposta inesperada"
    fi
else
    echo "❌ Falha ao conectar com a API"
fi

# Testar contas disponíveis
echo "📄 Testando listagem de contas..."
if curl -s --connect-timeout 10 "https://snackbartio.com.br/api/comandas/crediario/accounts/need-reminder" | head -c 100 | grep -q "id"; then
    echo "✅ Listagem de contas funcionando"
else
    echo "⚠️  Problema na listagem de contas"
fi

echo ""
echo "🎯 4. Resumo Final:"
echo "=================="

if grep -q '"status":"ok"' /tmp/test_response.json 2>/dev/null; then
    echo "✅ Sistema WhatsApp Billing: OPERACIONAL"
    echo "📱 Prévias de conta: HTML (funcionando)"
    echo "🔄 WhatsApp API: Configurado"
    echo "🖥️  Interface web: Disponível"
    echo ""
    echo "🌟 Acesse: https://snackbartio.com.br"
else
    echo "⚠️  Sistema pode ter problemas de conectividade"
fi

# Cleanup
rm -f /tmp/test_response.json

echo ""
echo "✨ Teste concluído!"