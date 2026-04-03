#!/bin/bash

# Script para Ubuntu 25.10 - Instalação Google Chrome para Puppeteer
# Versão otimizada para Ubuntu 25.x

echo "🔧 Instalando Google Chrome no Ubuntu 25.10..."
echo "📋 Versão do sistema: $(lsb_release -ds)"

# Atualizar repositórios
echo "🔄 Atualizando repositórios..."
sudo apt update

# Método 1: Instalar Google Chrome via snap (mais confiável no Ubuntu 25.x)
echo "📦 Tentando Google Chrome via Snap..."
if sudo snap install chromium; then
    echo "✅ Chromium instalado via Snap!"
    echo "🔗 Criando link simbólico para Puppeteer..."
    sudo ln -sf /snap/bin/chromium /usr/bin/chromium-browser
    sudo ln -sf /snap/bin/chromium /usr/bin/google-chrome-stable
else
    echo "⚠️  Snap falhou, tentando método tradicional..."
    
    # Método 2: Repositório oficial Google (fallback)
    echo "📥 Baixando chave do repositório Google..."
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg
    
    echo "📋 Adicionando repositório Google Chrome..."
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    
    sudo apt update
    
    if sudo apt install -y google-chrome-stable; then
        echo "✅ Google Chrome instalado!"
    else
        echo "⚠️  Tentando instalar dependências mínimas..."
        
        # Método 3: Dependências essenciais para Ubuntu 25.x
        sudo apt install -y \
            libnss3 \
            libatk-bridge2.0-0 \
            libdrm2 \
            libxcomposite1 \
            libxdamage1 \
            libxrandr2 \
            libgbm1 \
            libxss1 \
            libasound2t64 || sudo apt install -y libasound2
        
        echo "✅ Dependências básicas instaladas!"
    fi
fi

echo ""
echo "🧪 Testando instalação..."
if command -v google-chrome-stable &> /dev/null; then
    echo "✅ Google Chrome disponível: $(google-chrome-stable --version)"
elif command -v chromium &> /dev/null; then
    echo "✅ Chromium disponível: $(chromium --version)"  
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium Browser disponível: $(chromium-browser --version)"
else
    echo "⚠️  Nenhum browser encontrado. Sistema continuará usando HTML."
fi

echo ""
echo "🎯 Próximos passos:"
echo "1. Reinicie o servidor: pm2 restart all"
echo "2. Teste o sistema: curl https://snackbartio.com.br/api/comandas/crediario/test-image-system"
echo "3. Se ainda houver problemas, o sistema HTML já funciona perfeitamente!"