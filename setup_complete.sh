#!/bin/bash

# Script de setup completo para WhatsApp Billing System
# Ubuntu 25.10 - Configuração automática

echo "🚀 Setup WhatsApp Billing System - Ubuntu 25.10"
echo "==============================================="

echo ""
echo "📋 Etapa 1: Verificando sistema..."
echo "Versão: $(lsb_release -ds)"
echo "Usuário: $(whoami)"

echo ""
echo "🔧 Etapa 2: Instalando Chrome para Puppeteer..."
if [ -f "./install_chrome_simple.sh" ]; then
    echo "Executando instalação do Chrome..."
    bash ./install_chrome_simple.sh
else
    echo "⚠️  Script install_chrome_simple.sh não encontrado, pulando..."
fi

echo ""
echo "⚡ Etapa 3: Reiniciando serviços PM2..."
if command -v pm2 &> /dev/null; then
    echo "🔄 Reiniciando PM2..."
    pm2 restart all
    sleep 5
    echo "📊 Status dos serviços:"
    pm2 list --no-color
else
    echo "⚠️  PM2 não encontrado, serviços podem precisar ser reiniciados manualmente"
fi

echo ""
echo "🧪 Etapa 4: Executando testes do sistema..."
if [ -f "./test_system.sh" ]; then
    echo "Executando testes automatizados..."
    bash ./test_system.sh
else
    echo "⚠️  Script de teste não encontrado, executando teste básico..."
    
    # Teste básico manual
    echo "📡 Testando conectividade da API..."
    if curl -s --connect-timeout 10 "https://snackbartio.com.br/api/comandas/crediario/test-image-system" | grep -q '"status":"ok"'; then
        echo "✅ API funcionando!"
    else
        echo "⚠️  Possível problema na API"
    fi
fi

echo ""
echo "🎯 Setup Concluído!"
echo "=================="
echo ""
echo "📱 Próximos passos:"
echo "1. Acesse: https://snackbartio.com.br"
echo "2. Vá para a seção 'Crediário'"  
echo "3. Teste a funcionalidade de prévia (ícone 👁️)"
echo "4. Envie uma conta via WhatsApp para teste"
echo ""
echo "🔧 Se houver problemas:"
echo "- Verifique logs: pm2 logs app-server"
echo "- Execute: bash test_system.sh"
echo "- O sistema HTML funciona mesmo sem Chrome"
echo ""
echo "✨ Sistema pronto para uso!"