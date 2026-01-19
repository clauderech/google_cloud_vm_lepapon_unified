# JWT Implementação - Próximas Etapas Críticas

**Status:** ✅ Passos 1, 2 e 3 completados e integrados

## 📋 Resumo do que foi feito

### Passo 1: Desabilitar Modo Demo em Produção
✅ **Concluído** - Arquivo `.env.example` atualizado:
```bash
VITE_DEMO_MODE=false              # Produção: desabilita hardcoded users
VITE_API_URL=https://seu-api.com  # URL do backend em produção
```

**Local Development (.env.local):**
```bash
VITE_DEMO_MODE=true               # Desenvolvimento: usa usuários locais
VITE_API_URL=http://localhost:3000
```

### Passo 2: Autenticação no Backend
✅ **Concluído** - Arquivo `/backend/routes/auth.js` criado com:
- `POST /api/auth/login` - Valida credenciais, retorna JWT token
- `POST /api/auth/validate` - Verifica se token é válido
- `POST /api/auth/logout` - Logout do usuário
- `GET /api/auth/me` - Retorna dados do usuário autenticado

**Integração em app.js:**
```javascript
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);  // ✅ JÁ IMPLEMENTADO
```

### Passo 3: JWT no Frontend
✅ **Concluído** - Arquivo `Login.tsx` atualizado para:
- Detectar modo demo via `VITE_DEMO_MODE`
- Em produção: enviar POST para `/api/auth/login` com credenciais
- Em desenvolvimento: usar credenciais locais (fallback)
- Salvar JWT token em `localStorage.auth_token`
- Passar token para `useAuth` hook

---

## 🔧 Próximas Etapas (Importantes!)

### 1️⃣ Integração de Token em Requisições da API
**Arquivo:** `frontend/services/` (ou onde estão suas chamadas API)

```typescript
// Adicionar header de autorização em TODAS as requisições
const token = localStorage.getItem('auth_token');
const headers = {
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` })
};

fetch('/api/endpoint', {
  method: 'POST',
  headers,
  body: JSON.stringify({...})
});
```

### 2️⃣ Atualizar useAuth Hook
**Arquivo:** `frontend/hooks/useAuth.ts`

```typescript
// Adicionar validação de token ao carregar
useEffect(() => {
  const validateToken = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // Token expirou, fazer logout
        logout();
      }
    } catch (error) {
      console.error('Token validation failed:', error);
    }
  };

  validateToken();
}, []);
```

### 3️⃣ Middleware de Autenticação no Backend
**Arquivo:** `backend/middleware/authMiddleware.js` (criar novo)

```javascript
module.exports = (req, res, next) => {
  const token = req.headers.authorization?.substring(7); // Remove "Bearer "
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    req.user = decoded;  // Tornar dados do usuário disponíveis
    next();
  });
};
```

Usar em rotas protegidas:
```javascript
const authMiddleware = require('../middleware/authMiddleware');

app.get('/api/protected-endpoint', authMiddleware, (req, res) => {
  // req.user agora contém os dados do usuário autenticado
  res.json({ user: req.user });
});
```

### 4️⃣ Melhorias de Segurança Recomendadas
- [ ] Adicionar **bcrypt** para hash de senhas (se usando DB real)
- [ ] Implementar **refresh tokens** (para renovar accesso sem fazer login novamente)
- [ ] Adicionar **rate limiting** no endpoint `/api/auth/login`
- [ ] Implementar **HTTPS** em produção (não HTTP)
- [ ] Adicionar **CORS stricto** (definir origins específicas)

---

## 📊 Fluxo de Autenticação Atual

```
1. Usuário digita credenciais no Login.tsx
   ↓
2. Se VITE_DEMO_MODE=true:
   - Valida contra credenciais locais (env vars)
   ↓
3. Se VITE_DEMO_MODE=false:
   - POST /api/auth/login {username, password}
   ↓
4. Backend valida no auth.js
   - Retorna: {token, user, expiresIn}
   ↓
5. Frontend armazena token em localStorage
   ↓
6. Usuário faz requisições com: Authorization: Bearer {token}
   ↓
7. Backend valida token via middleware
   - Se válido: req.user = decoded token data
   - Se inválido: 401 Unauthorized
```

---

## 🐛 Testando a Implementação

### Local Development (com modo demo):
```bash
# No terminal, rode o frontend
cd frontend && npm run dev

# Acesse http://localhost:5173
# Clique em "Entrar" com credenciais exibidas na tela
# Deve fazer login com usuários locais
```

### Produção (com API real):
```bash
# No .env do frontend
VITE_DEMO_MODE=false
VITE_API_URL=https://sua-api.com

# O login enviará POST para https://sua-api.com/api/auth/login
# Precisa do backend rodando em produção com auth.js integrado
```

---

## ⚠️ Checklist Final

- [ ] Backend: auth.js integrado em app.js
- [ ] Backend: Variáveis de ambiente configuradas (JWT_SECRET, etc)
- [ ] Frontend: Login.tsx usando /api/auth/login em produção
- [ ] Frontend: Token armazenado em localStorage
- [ ] Frontend: Requisições incluem Authorization header
- [ ] Frontend: useAuth hook valida token ao iniciar
- [ ] Backend: Middleware de autenticação criado e usado em rotas protegidas
- [ ] CORS configurado para permitir requisições do frontend
- [ ] Testes manuais: Login → Dashboard → Logout funcionam corretamente

---

## 📚 Referências Rápidas

**JWT (JSON Web Tokens):**
- Estrutura: `header.payload.signature`
- Payload contém: user id, username, role, exp (expiração)
- Stateless: servidor não precisa armazenar sessões

**localStorage vs sessionStorage:**
- `localStorage`: persiste mesmo após fechar navegador
- `sessionStorage`: limpa ao fechar navegador
- Usar `localStorage` para autenticação persistente

**Como validar token manual:**
```javascript
// No console do navegador
const token = localStorage.getItem('auth_token');
console.log(JSON.parse(atob(token.split('.')[1])));  // Vê o payload
```

---

**Próximo passo:** Implementar middleware de autenticação no backend e atualizar requisições da API para incluir token JWT.
