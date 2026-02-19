#!/bin/bash

# Script para instalar dependências mínimas do Chrome no servidor Google Cloud
# Execute apenas se quiser usar Puppeteer como fallback (PDFKit já funciona)

echo "🔧 Instalando dependências mínimas do Chrome para Puppeteer..."

# Atualiza repositórios
sudo apt update

# Instala apenas dependências essenciais do Chrome
sudo apt install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

echo "✅ Dependências instaladas com sucesso!"
echo ""
echo "📋 IMPORTANTE:"
echo "- O sistema agora usa PDFKit por padrão (mais leve e confiável)"
echo "- Puppeteer é usado apenas como fallback"
echo "- Reinicie o servidor: pm2 restart all"
echo ""