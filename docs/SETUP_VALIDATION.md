# 📋 Sistema de Validação de Variáveis de Ambiente

## O que foi criado?

Um sistema completo de logging e validação de variáveis de ambiente que:

✅ **Verifica todas as variáveis obrigatórias** na inicialização  
✅ **Exibe logs detalhados** de cada variável configurada  
✅ **Oculta valores sensíveis** (tokens, senhas) nos logs  
✅ **Fornece script de verificação independente**  
✅ **Integra automaticamente** com `npm start` e `npm dev`

---

## 📁 Arquivos Criados/Modificados

### Novos Arquivos:

1. **`backend/config/validateEnv.js`**
   - Módulo de validação de variáveis de ambiente
   - Lista variáveis obrigatórias e opcionais
   - Exibe relatório formatado

2. **`backend/scripts/check-env.js`**
   - Script executável independente
   - Pode ser rodado sem iniciar a aplicação

3. **`.env.example`**
   - Template com todos os valores esperados
   - Comentários explicativos detalhados
   - Copie para `.env` e configure

4. **`docs/ENVIRONMENT_VARIABLES.md`**
   - Documentação completa de cada variável
   - Exemplos de configuração
   - Guias para diferentes plataformas de nuvem

### Arquivos Modificados:

- **`backend/app.js`** - Adicionado import e chamada de `validateEnvironment()`
- **`package.json`** - Adicionado script `npm run check:env`

---

## 🚀 Como Usar

### 1. **Verificar variáveis sem iniciar a aplicação**

```bash
npm run check:env
```

Isso mostrará um relatório completo como:

```
================================================================================
  VALIDAÇÃO DE VARIÁVEIS DE AMBIENTE
================================================================================

📋 VARIÁVEIS OBRIGATÓRIAS:
  ❌ DB_CLIENT = NÃO CONFIGURADA
  ✅ WHATSAPP_ACCESS_TOKEN = EAABs4K2G... (primeiros 50 caracteres)
  ...

❌ ERRO: Variáveis obrigatórias não configuradas:
  ❌ DB_CLIENT
  ❌ WHATSAPP_FLOW_PRIVATE_KEY_PATH
  ...
```

### 2. **Configurar o arquivo .env**

```bash
cp .env.example .env
nano .env  # ou seu editor preferido
```

Configure todas as variáveis obrigatórias com seus valores reais.

### 3. **Ao iniciar a aplicação**

```bash
npm run dev    # development
# ou
npm run prod   # production
```

A validação rodará automaticamente antes de iniciar o PM2.

---

## 📊 Variáveis Obrigatórias

Para a aplicação funcionar, configure **obrigatoriamente**:

| Variável | Descrição |
|----------|-----------|
| `DB_CLIENT` | Tipo de banco (mysql2, postgresql) |
| `DB_HOST` | Host do banco de dados |
| `DB_PORT` | Porta do banco (3306 padrão MySQL) |
| `DB_USER` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |
| `DB_NAME` | Nome do banco de dados |
| `WHATSAPP_FLOW_PRIVATE_KEY_PATH` | Caminho da chave privada RSA |
| `WHATSAPP_APP_SECRET` | App Secret do Meta |
| `WHATSAPP_ACCESS_TOKEN` | Token de acesso da API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp Business |
| `WHATSAPP_VERIFY_TOKEN` | Token de validação de webhook |

---

## 🔒 Dicas de Segurança

1. **Nunca commit o `.env` com dados reais!**
   ```bash
   echo ".env" >> .gitignore
   ```

2. **Use `.env.example` como template**
   - Mantenha `.env.example` no repositório com placeholders
   - Valores reais apenas em `.env` local/servidor

3. **Em produção (Google Cloud, AWS, etc)**
   - Configure variáveis via painel da plataforma
   - Use Secret Manager para valores sensíveis
   - Não use arquivos `.env`

4. **Rotacione tokens regularmente**
   - WhatsApp tokens podem expirar
   - Atualize conforme necessário

---

## 🛠️ Troubleshooting

### Erro: "WHATSAPP_FLOW_PRIVATE_KEY_PATH não configurado"

**Solução:**
1. Confirme a variável no `.env`
2. Verifique se o arquivo de chave existe
3. Use caminho absoluto se tiver problemas com caminho relativo

```bash
# Verificar se arquivo existe
ls -la backend/keys/whatsapp_flow_private_key.pem
```

### Erro: "Não conseguiu conectar ao banco"

**Solução:**
1. Execute `npm run check:env` para ver os valores
2. Teste conexão manualmente
3. Verifique firewall/segurança de rede

```bash
mysql -h localhost -u seu_usuario -p seu_banco
```

### Script retorna erro (exit code 1)

**Significa:** Há variáveis obrigatórias faltando  
**Solução:** Configure todas as variáveis em vermelho (❌) no `.env`

---

## 📚 Documentação Completa

Para mais detalhes sobre cada variável, veja:
- **`docs/ENVIRONMENT_VARIABLES.md`** - Guia completo com exemplos
- **`.env.example`** - Template comentado

---

## ✅ Checklist de Configuração

- [ ] Copiei `.env.example` para `.env`
- [ ] Configurei banco de dados (DB_*)
- [ ] Configurei WhatsApp Flow (WHATSAPP_FLOW_*)
- [ ] Configurei WhatsApp API (WHATSAPP_*)
- [ ] Rodei `npm run check:env` e confirmei todas as variáveis
- [ ] Testei inicializar com `npm run dev`

---

## 📝 Exemplo de .env Completo

```env
# Banco
DB_CLIENT=mysql2
DB_HOST=localhost
DB_PORT=3306
DB_USER=lepapon_user
DB_PASSWORD=senha_super_segura
DB_NAME=lepapon_unified_db

# Servidor
PORT=3000
NODE_ENV=production

# WhatsApp Flow
WHATSAPP_FLOW_PRIVATE_KEY_PATH=./keys/whatsapp_flow_private_key.pem
WHATSAPP_APP_SECRET=sua_app_secret

# WhatsApp API
WHATSAPP_ACCESS_TOKEN=EAABs4K2G...
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
WHATSAPP_VERIFY_TOKEN=seu_verify_token
```

---

Se tiver dúvidas, execute `npm run check:env` para ver exatamente o que está faltando! 🚀
