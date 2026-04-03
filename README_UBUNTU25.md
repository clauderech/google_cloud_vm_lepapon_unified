# WhatsApp Billing System - Ubuntu 25.10

Sistema completo de cobrança via WhatsApp com interface web e geração automática de contas.

## 🎯 Status do Sistema

✅ **Sistema Principal**: Totalmente operacional  
✅ **Fallback HTML**: Funcionando (independente do Chrome)  
✅ **WhatsApp API**: Integrado via Meta Business API  
✅ **Interface Web**: Completa com filtros e prévia  
⚠️ **Puppeteer/Chrome**: Opcional (para imagens PNG)  

## 🚀 Instalação no Ubuntu 25.10

### 1. Setup Automático (Recomendado)
```bash
chmod +x setup_complete.sh test_system.sh
bash setup_complete.sh
```

### 2. Instalação Manual do Chrome
```bash
chmod +x install_chrome_simple.sh
bash install_chrome_simple.sh
```

### 3. Teste do Sistema
```bash
chmod +x test_system.sh
bash test_system.sh
```

## 📱 Como Usar

1. **Acesse**: https://snackbartio.com.br
2. **Navegue**: Menu → Crediário → Aba "Contas"
3. **Filtrar**: Digite nome do cliente na busca
4. **Prévia**: Clique no ícone 👁️ para visualizar
5. **Enviar**: Botão "Enviar WhatsApp"

## 🔧 Scripts Disponíveis

- `setup_complete.sh` - Configuração automática completa
- `install_chrome_simple.sh` - Instalar Chrome para Ubuntu 25.10
- `test_system.sh` - Testar funcionalidades do sistema
- `install_chrome_deps.sh` - Dependências específicas (legado)

## 🎯 Funcionalidades

### Interface Web
- ✅ Listagem de contas com paginação
- ✅ Filtro por nome de cliente
- ✅ Prévia visual das contas
- ✅ Histórico de envios WhatsApp
- ✅ Agendamento de lembretes

### Sistema de Imagens
- ✅ **Fallback HTML** - Sempre funciona
- ⚡ **PNG via Puppeteer** - Se Chrome disponível
- 🔄 **Detecção automática** - Troca transparente
- 📱 **Mobile-friendly** - Responsivo

### WhatsApp Integration
- 📱 **Meta Business API** - Oficial
- 🔄 **Tracking completo** - Status das mensagens  
- 📊 **Analytics** - Métricas de envio
- ⏰ **Agendamento** - Lembretes automáticos

## 🐛 Troubleshooting

### Chrome/Puppeteer não funciona
```bash
# Sistema já funciona com HTML - não é crítico
# Para corrigir (opcional):
bash install_chrome_simple.sh
pm2 restart all
```

### API não responde
```bash
# Verificar serviços
pm2 list
pm2 logs app-server

# Reiniciar se necessário
pm2 restart all
```

### Teste diagnóstico
```bash
curl https://snackbartio.com.br/api/comandas/crediario/test-image-system
```

## 📊 Logs e Monitoramento

```bash
# Ver logs em tempo real
pm2 logs app-server

# Status dos serviços
pm2 list

# Reiniciar serviços
pm2 restart all
```

## 🎉 Conclusão

O sistema está **100% operacional** mesmo sem Chrome instalado. O fallback HTML oferece:

- ✅ Mesma funcionalidade completa
- ✅ Prévias bonitas e profissionais  
- ✅ Zero dependências complexas
- ✅ Compatibilidade total Ubuntu 25.10

Para imagens PNG (opcional), use `bash install_chrome_simple.sh`.