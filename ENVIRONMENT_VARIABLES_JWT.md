# 🔧 Configuração de Variáveis de Ambiente - JWT

## 📋 Resumo Rápido

Existem **dois arquivos** de configuração:

1. **`.env.example`** → Template para toda a equipe (commitado no Git)
2. **`.env.local`** → Suas configurações pessoais (git-ignored, nunca comitar)

---

## 🔒 .env.example (Compartilhado com o Time)

**Localização:** `/home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified/.env.example`

**Conteúdo para DESENVOLVIMENTO:**
```bash
# FRONTEND - Configuração do React
VITE_DEMO_MODE=true                  # Modo demonstração (usa credenciais locais)
VITE_API_URL=http://localhost:3000   # URL do backend local
VITE_DEMO_USER_ADMIN=admin           # Usuário demo
VITE_DEMO_PASS_ADMIN=admin123        # Senha demo
VITE_DEMO_USER_OPERADOR=operador
VITE_DEMO_PASS_OPERADOR=operador123
VITE_DEMO_USER_CAIXA=caixa
VITE_DEMO_PASS_CAIXA=caixa123

# BACKEND - Configuração do Node.js/Express
JWT_SECRET=seu-secret-super-seguro   # MUDE em produção!
NODE_ENV=development
```

**Conteúdo para PRODUÇÃO:**
```bash
# FRONTEND
VITE_DEMO_MODE=false                      # Desabilita demo
VITE_API_URL=https://sua-api-prod.com    # URL do backend em produção
VITE_DEMO_USER_ADMIN=                    # Deixar vazio (não usado)
VITE_DEMO_PASS_ADMIN=
VITE_DEMO_USER_OPERADOR=
VITE_DEMO_PASS_OPERADOR=
VITE_DEMO_USER_CAIXA=
VITE_DEMO_PASS_CAIXA=

# BACKEND
JWT_SECRET=segredo-aleatorio-super-longo-e-seguro-ALTERAR
NODE_ENV=production
```

---

## 🔐 .env.local (Pessoal - NÃO COMPARTILHAR)

**Localização:** `/home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified/.env.local`

**Status:** Criado automaticamente, git-ignored (seguro)

**Conteúdo Recomendado (Desenvolvimento):**
```bash
# FRONTEND
VITE_DEMO_MODE=true
VITE_API_URL=http://localhost:3000
VITE_DEMO_USER_ADMIN=admin
VITE_DEMO_PASS_ADMIN=admin123
VITE_DEMO_USER_OPERADOR=operador
VITE_DEMO_PASS_OPERADOR=operador123
VITE_DEMO_USER_CAIXA=caixa
VITE_DEMO_PASS_CAIXA=caixa123

# BACKEND
JWT_SECRET=dev-secret-key-pode-mudar
NODE_ENV=development
```

---

## 🔄 Como Funciona

### Desenvolvimento (Seu Computador)

```
Arquivo: .env.local
VITE_DEMO_MODE=true
VITE_API_URL=http://localhost:3000

Comportamento:
├─ Frontend: Usa credenciais locais (sem chamar API)
├─ Backend: Não precisa estar rodando
└─ Teste: Rápido, offline-first
```

### Produção (Servidor)

```
Variáveis de Ambiente do Sistema
VITE_DEMO_MODE=false
VITE_API_URL=https://api.producao.com

Comportamento:
├─ Frontend: Chama POST /api/auth/login no backend
├─ Backend: Valida credenciais e retorna JWT
└─ Teste: Online, integrado com API real
```

---

## 📝 Explicação Detalhada de Cada Variável

### Frontend (VITE_*)

| Variável | Tipo | Produção | Dev | Descrição |
|----------|------|----------|-----|-----------|
| `VITE_DEMO_MODE` | boolean | `false` | `true` | Usa credenciais hardcoded |
| `VITE_API_URL` | string | HTTPS URL | `http://localhost:3000` | URL do backend |
| `VITE_DEMO_USER_ADMIN` | string | (vazio) | `admin` | Username para demo |
| `VITE_DEMO_PASS_ADMIN` | string | (vazio) | `admin123` | Password para demo |
| `VITE_DEMO_USER_OPERADOR` | string | (vazio) | `operador` | Username operador |
| `VITE_DEMO_PASS_OPERADOR` | string | (vazio) | `operador123` | Password operador |
| `VITE_DEMO_USER_CAIXA` | string | (vazio) | `caixa` | Username caixa |
| `VITE_DEMO_PASS_CAIXA` | string | (vazio) | `caixa123` | Password caixa |

### Backend (Sem VITE_)

| Variável | Tipo | Exemplo | Descrição |
|----------|------|---------|-----------|
| `JWT_SECRET` | string | `seu-secret-super-seguro` | Chave para assinar JWT |
| `NODE_ENV` | string | `development` ou `production` | Ambiente |
| `PORT` | number | `3000` | Porta do backend (padrão) |
| `DB_HOST` | string | `localhost` | Host do banco (se tiver) |
| `DB_USER` | string | (seu usuário) | Usuário do banco |
| `DB_PASSWORD` | string | (sua senha) | Senha do banco |

---

## ⚙️ Como Carregar as Variáveis

### Frontend (React + Vite)

```typescript
// Qualquer arquivo React
const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const apiUrl = import.meta.env.VITE_API_URL;

console.log(demoMode);  // true (em dev)
console.log(apiUrl);    // "http://localhost:3000" (em dev)
```

**Importante:** Precisa do prefixo `VITE_` para que Vite exponha a variável!

### Backend (Node.js)

```javascript
// Qualquer arquivo Node.js
const jwtSecret = process.env.JWT_SECRET;
const nodeEnv = process.env.NODE_ENV;

console.log(jwtSecret);  // "seu-secret..."
console.log(nodeEnv);    // "development"
```

**Importante:** Sem prefixo `VITE_`, usa direto `process.env`

---

## 🚀 Setup Recomendado

### Passo 1: Clonar Repositório

```bash
git clone seu-repo
cd seu-projeto
```

### Passo 2: Criar .env.local (Primeira Vez)

```bash
cat > .env.local << 'EOF'
VITE_DEMO_MODE=true
VITE_API_URL=http://localhost:3000
VITE_DEMO_USER_ADMIN=admin
VITE_DEMO_PASS_ADMIN=admin123
VITE_DEMO_USER_OPERADOR=operador
VITE_DEMO_PASS_OPERADOR=operador123
VITE_DEMO_USER_CAIXA=caixa
VITE_DEMO_PASS_CAIXA=caixa123
JWT_SECRET=dev-secret-key
NODE_ENV=development
EOF
```

### Passo 3: Instalar Dependências

```bash
cd frontend && npm install
cd ../backend && npm install
```

### Passo 4: Rodar

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## ⚠️ Boas Práticas

### ✅ FAÇA

- ✅ Copiar `.env.example` para `.env.local` e customizar
- ✅ Manter `.env.local` no `.gitignore`
- ✅ Usar `VITE_` apenas para variáveis que precisam estar no frontend
- ✅ Usar secrets diferentes para dev e produção
- ✅ Documentar todas as variáveis em `.env.example`

### ❌ NÃO FAÇA

- ❌ Comitar `.env.local` no Git
- ❌ Hardcoder valores em código (usar variáveis de ambiente)
- ❌ Usar mesma senha em dev e produção
- ❌ Esquecer de alterar `JWT_SECRET` em produção
- ❌ Expor variáveis sensíveis em `.env.example`

---

## 🔒 Segurança do JWT_SECRET

### ⚠️ CRÍTICO

O `JWT_SECRET` é a chave para assinar todos os tokens JWT. Se vazar:
- Qualquer pessoa pode criar tokens válidos
- Sistema fica comprometido

### Como Escolher Uma Boa Senha

**❌ Ruim:**
```bash
JWT_SECRET=123456              # Muito fraco
JWT_SECRET=senha               # Muito fraco
JWT_SECRET=admin               # Óbvio
```

**✅ Bom:**
```bash
# Gerar com OpenSSL
openssl rand -base64 32
# Retorna: 8hK9xL2mP7qW4dR9tY5vF3nB8sG2jH6mK4xC5zD7pE9uI1oA

JWT_SECRET=8hK9xL2mP7qW4dR9tY5vF3nB8sG2jH6mK4xC5zD7pE9uI1oA
```

---

## 📊 Matriz de Variáveis

```
┌─────────────────────────────────────────────────────────────┐
│              VARIÁVEIS DE AMBIENTE NECESSÁRIAS              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  .env.example (Compartilhado)                               │
│  ├─ VITE_DEMO_MODE               [sim/não, público]         │
│  ├─ VITE_API_URL                 [URL, público]             │
│  ├─ VITE_DEMO_USER_*             [sim/não, público]         │
│  ├─ VITE_DEMO_PASS_*             [sim/não, público]         │
│  ├─ JWT_SECRET                   [template apenas!]         │
│  └─ NODE_ENV                     [desenvolvimento/prod]     │
│                                                              │
│  .env.local (Pessoal)                                       │
│  ├─ Copia de .env.example com valores reais                 │
│  └─ NUNCA comitar (git-ignored)                             │
│                                                              │
│  Variáveis de Sistema (Produção)                            │
│  ├─ VITE_DEMO_MODE=false         [SET via deploy]           │
│  ├─ VITE_API_URL={prod-url}      [SET via deploy]           │
│  ├─ JWT_SECRET={prod-secret}     [SET via secrets]          │
│  └─ NODE_ENV=production          [SET via deploy]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testando Variáveis de Ambiente

### Frontend

```javascript
// Abrir DevTools Console e digitar:
import.meta.env.VITE_DEMO_MODE      // "true"
import.meta.env.VITE_API_URL        // "http://localhost:3000"
import.meta.env.VITE_DEMO_USER_ADMIN // "admin"
```

### Backend

```bash
# No terminal
node -e "console.log(process.env.JWT_SECRET)"
# Retorna: seu-secret-super-seguro

node -e "console.log(process.env.NODE_ENV)"
# Retorna: development
```

---

## 🚨 Troubleshooting

### Frontend não carrega variáveis

**Problema:** `import.meta.env.VITE_DEMO_MODE` retorna `undefined`

**Solução:**
1. Verificar se tem prefixo `VITE_` em `.env.local`
2. Reiniciar `npm run dev` (importante!)
3. Verificar se a variável está sendo usada corretamente

### Backend não reconhece JWT_SECRET

**Problema:** `process.env.JWT_SECRET` retorna `undefined`

**Solução:**
1. Verificar se `.env.local` ou `.env` existe
2. Usar `require('dotenv').config()` no app.js (já está lá)
3. Reiniciar `npm start`

### Erro "Token não fornecido"

**Problema:** Token JWT não está sendo enviado

**Solução:**
1. Verificar se `localStorage.getItem('auth_token')` retorna algo
2. Verificar se header Authorization está correto
3. Verificar console do navegador para ver o request

---

## 📞 Referência Rápida

```bash
# Ver todas as variáveis carregadas
node -e "require('dotenv').config(); console.log(process.env)"

# Gerar novo JWT_SECRET
openssl rand -base64 32

# Editar .env.local
nano .env.local

# Verificar se arquivo existe
ls -la .env.local
```

---

**Próximo passo:** Seguir QUICK_START_JWT_TESTING.md para testar tudo!
