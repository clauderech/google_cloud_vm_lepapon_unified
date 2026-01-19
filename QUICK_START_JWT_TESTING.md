# 🚀 Quick Start - Testar Autenticação JWT

## 5 Minutos para Testar Tudo

### Passo 1: Ambiente de Desenvolvimento

```bash
# 1.1 - Frontend: Garantir .env.local com VITE_DEMO_MODE=true
cd frontend
cat > .env.local << 'EOF'
VITE_DEMO_MODE=true
VITE_API_URL=http://localhost:3000
VITE_DEMO_USER_ADMIN=admin
VITE_DEMO_PASS_ADMIN=admin123
VITE_DEMO_USER_OPERADOR=operador
VITE_DEMO_PASS_OPERADOR=operador123
VITE_DEMO_USER_CAIXA=caixa
VITE_DEMO_PASS_CAIXA=caixa123
EOF

# 1.2 - Backend: Garantir JWT_SECRET em .env
cd ../backend
cat >> .env << 'EOF'
JWT_SECRET=dev-secret-key-change-in-production
EOF
```

### Passo 2: Rodar Backend

```bash
cd backend
npm start

# Esperado na console:
# [DB] Conectado ao banco de dados lepapon_unified_db
# Server running on port 3000
```

### Passo 3: Rodar Frontend (outro terminal)

```bash
cd frontend
npm run dev

# Esperado:
# Local: http://localhost:5173
# Press 'o' to open in browser
```

### Passo 4: Testar Login no Navegador

1. Abrir http://localhost:5173
2. Ver badge "Modo Demonstração" em amarelo
3. Ver credenciais sugeridas na tela:
   - 👤 admin / admin123
   - 👤 operador / operador123
   - 👤 caixa / caixa123
4. Digitar `admin` / `admin123`
5. Clicar "Entrar"
6. ✅ Deve entrar no dashboard

### Passo 5: Testar com API Real

```bash
# 5.1 - Parar frontend e mudar .env.local
cd frontend
cat > .env.local << 'EOF'
VITE_DEMO_MODE=false
VITE_API_URL=http://localhost:3000
EOF

# 5.2 - Rodar novamente
npm run dev

# 5.3 - No navegador: login enviará POST para /api/auth/login
# ✅ Deve funcionar igual se backend estiver rodando
```

---

## 🧪 Testes com cURL (Command Line)

### Teste 1: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Esperado:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "admin_1",
#     "username": "admin",
#     "name": "Administrador",
#     "role": "admin"
#   },
#   "expiresIn": "7d"
# }
```

### Teste 2: Usar Token para Validar

```bash
# Copiar token da resposta anterior
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Validar
curl -X POST http://localhost:3000/api/auth/validate \
  -H "Authorization: Bearer $TOKEN"

# Esperado:
# {
#   "valid": true,
#   "user": {
#     "id": "admin_1",
#     "username": "admin",
#     "name": "Administrador",
#     "role": "admin",
#     "iat": 1705000000,
#     "exp": 1705604800
#   }
# }
```

### Teste 3: Sem Token (deve falhar)

```bash
curl -X GET http://localhost:3000/api/auth/me

# Esperado:
# {
#   "error": "Token não fornecido",
#   "message": "Header Authorization é obrigatório"
# }
```

### Teste 4: Token Inválido (deve falhar)

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN_INVALIDO"

# Esperado:
# {
#   "error": "Token inválido",
#   "message": "jwt malformed"
# }
```

---

## 🔍 Debug no Navegador

### 1. Ver Token Armazenado
```javascript
// Abrir DevTools (F12) → Console
localStorage.getItem('auth_token');
// Esperado: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Decodificar token (ver dados)
JSON.parse(atob(localStorage.getItem('auth_token').split('.')[1]));
// Esperado: { id, username, name, role, iat, exp }
```

### 2. Ver Sessão
```javascript
// DevTools → Console
JSON.parse(localStorage.getItem('lanchonete_session'));
// Esperado: { id, name, role, loginAt, token }
```

### 3. Verificar Request/Response
1. DevTools (F12) → Network tab
2. Fazer login
3. Procurar por `login` request
4. Ver POST `/api/auth/login` com:
   - **Request**: `{ username, password }`
   - **Response**: `{ token, user, expiresIn }`

---

## ⚠️ Problemas Comuns

### Backend não conecta (CORS error)

```
Access to XMLHttpRequest at 'http://localhost:3000/api/auth/login' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solução:** CORS já está configurado em backend/app.js:
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
```
Se ainda não funcionar, reiniciar backend.

### Login diz "Erro ao conectar ao servidor"

1. ✅ Backend está rodando? (ver "Server running on port 3000")
2. ✅ VITE_API_URL está correto? (ver .env.local)
3. ✅ Porta 3000 está livre? (lsof -i :3000)

### Token expirado logo após login

Normal! Token expira em 7 dias. Ver logs:
```javascript
// DevTools → Console
JSON.parse(atob(localStorage.getItem('auth_token').split('.')[1])).exp
// Timestamp de quando expira
```

---

## 📊 Checklist de Teste Funcional

### Frontend
- [ ] Login com credenciais corretas → entra no dashboard
- [ ] Login com credenciais incorretas → mostra erro
- [ ] Token armazenado em localStorage após login
- [ ] Modo demo mostra badge amarelo
- [ ] Modo produção NÃO mostra badge
- [ ] Spinner de loading aparece durante autenticação
- [ ] Inputs desabilitados durante autenticação

### Backend
- [ ] `POST /api/auth/login` com credenciais corretas → 200 + token
- [ ] `POST /api/auth/login` com credenciais incorretas → 401 + erro
- [ ] `POST /api/auth/validate` com token válido → 200 + válido
- [ ] `POST /api/auth/validate` sem token → 401 + erro
- [ ] `GET /api/auth/me` com token válido → 200 + dados do usuário
- [ ] Outras rotas API não funcionam sem token (quando protegidas)

### Integração
- [ ] Frontend dev (DEMO=true) não precisa de backend rodando
- [ ] Frontend prod (DEMO=false) precisa de backend rodando
- [ ] Trocar de DEMO=true/false requer npm run dev novamente

---

## 🎯 Próximos Passos (Pós-Testes)

1. **Proteger todas as rotas do backend**
   - Arquivo: `backend/app.js`
   - Adicionar authMiddleware em rotas existentes

2. **Integrar token em requisições da API**
   - Arquivo: `frontend/services/*`
   - Adicionar Authorization header

3. **Validar token ao iniciar frontend**
   - Arquivo: `frontend/hooks/useAuth.ts`
   - Chamar /api/auth/validate no useEffect

4. **Implementar logout com limpeza de token**
   - Arquivo: `frontend/hooks/useAuth.ts`
   - Limpar localStorage, redirecionar para login

---

## 📞 Referência Rápida

| O quê | Onde | Comando |
|------|------|---------|
| Rodar backend | `backend/` | `npm start` |
| Rodar frontend | `frontend/` | `npm run dev` |
| Testar login | cURL | `curl ... /api/auth/login` |
| Ver token | DevTools Console | `localStorage.getItem('auth_token')` |
| Debug auth | DevTools Network | Ver request/response |
| Resetar tudo | Terminal | `rm -f .env.local` (recriar) |

---

**Sucesso! 🎉 Autenticação JWT está pronta para uso!**
