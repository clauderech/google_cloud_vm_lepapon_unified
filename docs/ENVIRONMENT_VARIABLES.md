# Variáveis de Ambiente - Guia de Configuração

## Visão Geral

Este projeto requer que várias variáveis de ambiente sejam configuradas para funcionar corretamente. Este documento lista todas as variáveis necessárias e opcionais.

## Como Verificar as Variáveis de Ambiente

### Opção 1: Durante a inicialização da aplicação
Ao iniciar a aplicação com `npm start` ou `node app.js`, um log detalhado será exibido mostrando:
- ✅ Todas as variáveis obrigatórias que estão configuradas
- ❌ Variáveis obrigatórias faltando
- ⚠️ Variáveis opcionais que não estão configuradas

### Opção 2: Verificação manual
```bash
node backend/scripts/check-env.js
```

Este script verificará o arquivo `.env` e exibirá um relatório completo.

---

## Variáveis Obrigatórias

Estas variáveis **DEVEM** estar configuradas para a aplicação funcionar:

### Banco de Dados
```env
# Driver do banco de dados (mysql2, postgresql, sqlite3, etc)
DB_CLIENT=mysql2

# Conexão do banco
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=lepapon_unified_db
```

**Alternativa (Connection String):**
```env
DATABASE_URL=mysql2://usuario:senha@host:porta/banco
```

### WhatsApp Flow (Criptografia)
```env
# Caminho para a chave privada RSA
WHATSAPP_FLOW_PRIVATE_KEY_PATH=/path/to/private_key.pem

# Chave secreta para validação HMAC
WHATSAPP_APP_SECRET=sua_chave_secreta_do_meta
```

### WhatsApp API
```env
# Token de acesso do Meta
WHATSAPP_ACCESS_TOKEN=seu_token_de_acesso

# ID do número de telefone WhatsApp Business
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id

# Token para validação de webhook
WHATSAPP_VERIFY_TOKEN=seu_token_verificacao
```

---

## Variáveis Opcionais

Estas variáveis têm valores padrão e não precisam ser configuradas:

### Servidor
```env
# Porta do servidor (padrão: 3000)
PORT=3000

# Ambiente (development, production, etc)
NODE_ENV=production

# CORS origin (padrão: *)
CORS_ORIGIN=http://localhost:3000
```

### Banco de Dados (Avançado)
```env
# SSL para conexão do banco
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED_FALSE=true

# Pool de conexões
DB_POOL_MIN=0
DB_POOL_MAX=10

# Migrações
DB_MIGRATIONS_TABLE=knex_migrations
DB_MIGRATIONS_DIR=./migrations
```

### WhatsApp API (Avançado)
```env
# Versão da API do Graph (padrão: 20.0)
WHATSAPP_GRAPH_VERSION=20.0

# Template do WhatsApp
WHATSAPP_TEMPLATE_NAME=seu_template_name
WHATSAPP_TEMPLATE_LANG=pt_BR
WHATSAPP_TEMPLATE_FOOTER_TEXT=Rodapé do template
WHATSAPP_TEMPLATE_BUTTON_SUBTYPE=flow
WHATSAPP_TEMPLATE_BUTTON_INDEX=0
WHATSAPP_TEMPLATE_BUTTON_PAYLOAD=seu_payload
WHATSAPP_TEMPLATE_BUTTON_URL_TEXT=Abrir

# Tipos de destinatário
WHATSAPP_TEMPLATE_RECIPIENT_TYPE=individual
WHATSAPP_TEXT_RECIPIENT_TYPE=individual

# Concorrência de mensagens saintes
WHATSAPP_OUTBOUND_CONCURRENCY=2
WHATSAPP_OUTBOUND_MAX=2000
```

### Deploy (PM2/CI)
```env
# Usuário e host para deploy
DEPLOY_USER=deploy
DEPLOY_HOST=seu.servidor.com
```

---

## Exemplo de Arquivo .env

```env
# ===== BANCO DE DADOS =====
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=lepapon_user
DB_PASSWORD=super_secret_password_123
DB_NAME=lepapon_unified_db
DB_SSL=false

# ===== SERVIDOR =====
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com

# ===== WHATSAPP FLOW =====
WHATSAPP_FLOW_PRIVATE_KEY_PATH=/etc/secrets/whatsapp_private_key.pem
WHATSAPP_APP_SECRET=sua_app_secret_do_meta

# ===== WHATSAPP API =====
WHATSAPP_ACCESS_TOKEN=EAABs4K2G...seu_token_aqui
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_VERIFY_TOKEN=token_verificacao_webhook
WHATSAPP_GRAPH_VERSION=20.0
WHATSAPP_TEMPLATE_NAME=seu_template
WHATSAPP_TEMPLATE_LANG=pt_BR
```

---

## Em Ambiente de Nuvem (Google Cloud, AWS, Heroku, etc)

### Google Cloud Run / Cloud Functions
Use **Secret Manager** para armazenar valores sensíveis e configure via variáveis de ambiente.

### AWS Lambda / Elastic Beanstalk
Configure via **Systems Manager Parameter Store** ou **Secrets Manager** e exponha como variáveis de ambiente.

### Heroku
```bash
heroku config:set DB_HOST=seu-rds-endpoint.amazonaws.com
heroku config:set WHATSAPP_FLOW_PRIVATE_KEY_PATH=/app/.secrets/key.pem
```

### Docker
Passe as variáveis na inicialização:
```bash
docker run -e DB_HOST=localhost -e DB_USER=user ... seu-app
```

---

## Troubleshooting

### Erro: "WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado"
- Certifique-se de que a variável está definida no `.env`
- Verifique se o arquivo de chave privada existe no caminho especificado
- Se usar caminho relativo, coloque em relação ao diretório `backend/`

### Erro: "Não conseguiu conectar ao banco de dados"
- Verifique `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Use `node backend/scripts/check-env.js` para visualizar os valores configurados

### Erro: "Chave secreta do WhatsApp não configurada"
- Obtenha em: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Configure `WHATSAPP_APP_SECRET` no arquivo `.env`

---

## Checklist de Configuração

- [ ] `DB_CLIENT`, `DB_HOST`, `DB_PORT` configurados
- [ ] `DB_USER`, `DB_PASSWORD`, `DB_NAME` configurados
- [ ] `WHATSAPP_FLOW_PRIVATE_KEY_PATH` apontando para arquivo válido
- [ ] `WHATSAPP_APP_SECRET` configurado
- [ ] `WHATSAPP_ACCESS_TOKEN` obtido do Meta
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado
- [ ] `WHATSAPP_VERIFY_TOKEN` configurado
- [ ] Rodou `node backend/scripts/check-env.js` sem erros

---

## Contato / Suporte

Para problemas com configuração, verifique os logs ao iniciar a aplicação. O sistema exibirá um relatório completo de todas as variáveis de ambiente carregadas.
