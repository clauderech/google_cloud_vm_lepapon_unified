# 🔧 Troubleshooting: WHATSAPP_FLOW_PRIVATE_KEY_PATH Erro

## O Problema

Você vê este erro nos logs:

```
[Flow] Erro ao processar: WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado
Error: WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado
  at WhatsAppFlowProcessor.getDecryptedAesKey
  at handleWebhookEvent
```

---

## 🔍 Diagnóstico Rápido

Execute este comando para verificar o status:

```bash
npm run diagnose:flow
```

Isso mostrará:
- ✅ Se as variáveis de ambiente estão configuradas
- ✅ Se o arquivo de chave privada existe
- ✅ Se as permissões estão corretas
- ✅ Se o formato da chave é válido

---

## 🚨 Causas Possíveis

### 1. **Variável de ambiente não configurada**

**Sintoma:** Script de diagnóstico mostra `❌ NÃO CONFIGURADO`

**Solução:**
```bash
# Criar arquivo .env se não existir
cp .env.example .env

# Configurar a variável
WHATSAPP_FLOW_PRIVATE_KEY_PATH=/caminho/para/sua/chave/privada.pem
```

Verifique em: `echo $WHATSAPP_FLOW_PRIVATE_KEY_PATH`

---

### 2. **Arquivo de chave não encontrado**

**Sintoma:** 
```
Arquivo existe: ❌ NÃO
```

**Solução:**

O arquivo precisa estar no caminho correto. Existem 2 opções:

#### Opção A: Caminho Relativo (relativo ao `backend/`)
```bash
# Estrutura esperada
backend/
├── keys/
│   └── whatsapp_flow_private_key.pem  ← aqui
├── app.js
└── ...

# No .env
WHATSAPP_FLOW_PRIVATE_KEY_PATH=./keys/whatsapp_flow_private_key.pem
```

#### Opção B: Caminho Absoluto (em produção)
```bash
# Colocar em um diretório seguro
/etc/secrets/whatsapp_flow_private_key.pem
/home/deploy/.secrets/whatsapp_flow_private_key.pem
/var/www/secrets/whatsapp_flow_private_key.pem

# No .env
WHATSAPP_FLOW_PRIVATE_KEY_PATH=/etc/secrets/whatsapp_flow_private_key.pem
```

---

### 3. **Arquivo existe mas sem permissões de leitura**

**Sintoma:**
```
Permissões: 600
Leitura: ❌ NÃO PERMITIDA
```

**Solução:**
```bash
# Dar permissão de leitura ao arquivo
chmod 644 /caminho/para/whatsapp_flow_private_key.pem

# Ou se quiser ser mais restritivo (recomendado para produção)
chmod 400 /caminho/para/whatsapp_flow_private_key.pem

# E garantir que o usuário do Node pode ler
chown nobody:nogroup /caminho/para/whatsapp_flow_private_key.pem  # ou o usuário correto
```

---

### 4. **Arquivo não é uma chave RSA válida**

**Sintoma:**
```
Formato: ❌ Formato não reconhecido como chave privada RSA
```

**Solução:**

A chave deve começar com:
```
-----BEGIN RSA PRIVATE KEY-----
ou
-----BEGIN PRIVATE KEY-----
```

E terminar com:
```
-----END RSA PRIVATE KEY-----
ou
-----END PRIVATE KEY-----
```

Se não, a chave está incorreta. Obtenha a chave correta do Meta em:
https://developers.facebook.com/docs/whatsapp/flows

---

### 5. **Em Produção (Google Cloud, AWS, etc)**

**Para Google Cloud Run:**
```bash
# 1. Coloque a chave no Secret Manager
gcloud secrets create whatsapp-flow-key --data-file=/path/to/key.pem

# 2. Configure a variável de ambiente
gcloud run deploy seu-servico \
  --set-env-vars WHATSAPP_FLOW_PRIVATE_KEY_PATH=/run/secrets/whatsapp-flow-key
```

**Para AWS Lambda:**
```bash
# Use Parameter Store ou Secrets Manager
# Configure via IAM role

aws secretsmanager create-secret \
  --name whatsapp-flow-private-key \
  --secret-string file:///path/to/key.pem
```

**Para Heroku:**
```bash
# Converter chave para base64
cat /path/to/key.pem | base64 | tr -d '\n' > key.b64

# Configurar variável
heroku config:set WHATSAPP_FLOW_PRIVATE_KEY_B64=$(cat key.b64)

# No .env, decodificar na inicialização (veja exemplo abaixo)
```

---

## ✅ Checklist de Resolução

- [ ] Executei `npm run diagnose:flow` com sucesso
- [ ] Arquivo de chave existe e é legível
- [ ] Variável `WHATSAPP_FLOW_PRIVATE_KEY_PATH` está configurada no `.env`
- [ ] Formato da chave é válido (começa com BEGIN RSA PRIVATE KEY)
- [ ] Permissões estão corretas (chmod 644 ou 400)
- [ ] Testei com `npm run dev` ou `npm run prod`

---

## 🛠️ Comandos Úteis

```bash
# Verificar se arquivo existe e é legível
ls -la /caminho/para/whatsapp_flow_private_key.pem

# Ver primeiras linhas da chave (deve ser válida)
head -1 /caminho/para/whatsapp_flow_private_key.pem
# Esperado: -----BEGIN RSA PRIVATE KEY-----

# Verificar tamanho do arquivo
wc -c /caminho/para/whatsapp_flow_private_key.pem

# Dar permissões corretas
chmod 644 /caminho/para/whatsapp_flow_private_key.pem

# Verificar valor da variável de ambiente
echo $WHATSAPP_FLOW_PRIVATE_KEY_PATH

# Recarregar arquivo .env
source .env

# Executar diagnóstico
npm run diagnose:flow
```

---

## 📝 Exemplo de Configuração Completa

### Estrutura de Diretórios
```
/home/deploy/google_cloud_vm_lepapon_unified/
├── backend/
│   ├── keys/
│   │   └── whatsapp_flow_private_key.pem
│   ├── scripts/
│   │   ├── check-env.js
│   │   └── diagnose-flow.js
│   └── app.js
├── .env          ← Arquivo de configuração
├── .env.example
└── package.json
```

### Arquivo .env
```env
# Banco de dados
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=lepapon
DB_PASSWORD=sua_senha
DB_NAME=lepapon_whatsapp

# WhatsApp Flow - CHAVE PRIVADA
WHATSAPP_FLOW_PRIVATE_KEY_PATH=./keys/whatsapp_flow_private_key.pem

# WhatsApp - APP SECRET
WHATSAPP_APP_SECRET=sua_app_secret_aqui

# WhatsApp - ACCESS TOKEN
WHATSAPP_ACCESS_TOKEN=seu_token_aqui

# WhatsApp - OUTROS
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=seu_verify_token
```

### Inicializar Aplicação
```bash
# Fazer diagnóstico
npm run diagnose:flow

# Iniciar (dev)
npm run dev

# Ou iniciar (produção)
npm run prod

# Verificar logs
npm run logs
```

---

## 🆘 Ainda Não Funciona?

Se ainda houver problemas:

1. **Rode o diagnóstico:**
   ```bash
   npm run diagnose:flow 2>&1 | tee diagnose-output.txt
   ```

2. **Cole a saída aqui ou nos logs**

3. **Verifique também:**
   ```bash
   npm run check:env     # Variáveis de ambiente gerais
   npm run logs          # Logs da aplicação
   ```

4. **Procure por estas mensagens nos logs:**
   - `[Flow] Configuração validada com sucesso`
   - `[Flow] ✅` (sucesso)
   - `[Flow] ❌` (erro)

---

**Dica:** A maioria dos problemas é o arquivo estar em um caminho diferente do configurado. Use `npm run diagnose:flow` para identificar rapidamente! 🚀
