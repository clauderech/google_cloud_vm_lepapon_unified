# 🚨 AÇÃO IMEDIATA: Erro WHATSAPP_FLOW_PRIVATE_KEY_PATH em Produção

## O Que Está Acontecendo

A aplicação está **falhando ao processar WhatsApp Flows** porque:

```
❌ WHATSAPP_FLOW_PRIVATE_KEY_PATH está configurado
❌ Mas o arquivo de chave privada NÃO ESTÁ no servidor de produção
```

---

## ✅ Solução em 3 Passos

### **Passo 1: Obtenha o arquivo de chave privada**

A chave foi gerada quando você configurou WhatsApp Flows.

Se não tiver mais:
1. Acesse: https://developers.facebook.com/docs/whatsapp/flows
2. Procure por "Generate Key" ou regenere a chave
3. Download do arquivo `private_key.pem`

### **Passo 2: Coloque o arquivo no servidor de produção**

**Opção A - No diretório local (mais fácil):**
```bash
# Na sua máquina local
cd /home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified

# Criar diretório de chaves
mkdir -p backend/keys

# Copiar a chave para lá
cp /caminho/para/seu/private_key.pem backend/keys/whatsapp_flow_private_key.pem

# Dar permissão
chmod 644 backend/keys/whatsapp_flow_private_key.pem

# Fazer deploy para produção
git add backend/keys/whatsapp_flow_private_key.pem
git commit -m "Add WhatsApp Flow private key"
git push
```

**Opção B - Em produção via SSH (se não quiser commitar):**
```bash
# No servidor de produção
cd /var/www/google_cloud_vm_lepapon_unified

# Criar diretório seguro
sudo mkdir -p backend/keys
sudo chmod 755 backend/keys

# Copiar arquivo (via SCP ou outro método)
# Ou editar diretamente com nano:
sudo nano backend/keys/whatsapp_flow_private_key.pem
# Cole o conteúdo completo da chave

# Dar permissão
sudo chmod 644 backend/keys/whatsapp_flow_private_key.pem
```

### **Passo 3: Verificar e reiniciar**

```bash
# No servidor de produção
cd /var/www/google_cloud_vm_lepapon_unified

# Verificar se está tudo OK
npm run diagnose:flow

# Deve mostrar: ✅ RESUMO - TUDO OK

# Reiniciar a aplicação
npm run restart
# ou
pm2 restart webhook-whatsapp-meta

# Acompanhar os logs
npm run logs
```

---

## 📋 Arquivo .env Esperado

Sua variável de ambiente deve estar assim:

```env
WHATSAPP_FLOW_PRIVATE_KEY_PATH=./keys/whatsapp_flow_private_key.pem
```

Isso significa: **procure em `backend/keys/whatsapp_flow_private_key.pem`** (relativo ao diretório backend/)

---

## ✅ Checklist de Resolução Rápida

- [ ] Obti o arquivo `private_key.pem` do Meta
- [ ] Coloquei em `backend/keys/whatsapp_flow_private_key.pem`
- [ ] Dei permissão com `chmod 644`
- [ ] Rodei `npm run diagnose:flow` e viu ✅
- [ ] Reiniciei com `npm run restart`
- [ ] Verifiquei logs com `npm run logs`
- [ ] Testei um WebhookEvent do WhatsApp

---

## 🔍 Verificação

Depois de fazer o deploy, execute:

```bash
npm run diagnose:flow
```

**Esperado:**
```
✅ Variáveis de ambiente configuradas
✅ Arquivo de chave encontrado
✅ Permissões corretas
✅ Formato de chave válido

A aplicação pode processar WhatsApp Flows normalmente!
```

**Saiu com erro?** Veja `docs/TROUBLESHOOT_FLOW_KEY.md` para soluções detalhadas.

---

## 📚 Documentação Completa

Para mais detalhes e troubleshooting avançado:
```bash
cat docs/TROUBLESHOOT_FLOW_KEY.md
```

---

## 🆘 Precisa de Ajuda?

1. Rodou `npm run diagnose:flow`?
2. Viu qual é o problema exato?
3. Verifique `docs/TROUBLESHOOT_FLOW_KEY.md` para a solução específica

**Problema resolvido após fazer estes passos!** ✨
