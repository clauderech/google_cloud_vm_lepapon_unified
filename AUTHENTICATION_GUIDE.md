# 🔐 Guia de Autenticação Real - Lepapon

## Status: IMPLEMENTADO

O sistema de autenticação foi migrado de modo demo para usar autenticação JWT real com a tabela `users`.

---

## Configuração

### 1. Variáveis de Ambiente

Adicione ao `.env.local`:

```env
# ===== AUTENTICAÇÃO JWT =====
JWT_SECRET=sua-chave-secreta-muito-segura
JWT_EXPIRES_IN=24h
PASSWORD_SALT=salt-para-hash-seguro

# Desativar modo demo quando usar autenticação real
VITE_DEMO_MODE=false
```

⚠️ **IMPORTANTE**: Mude os valores padrão em produção!

---

## 2. Criar Usuários Iniciais

Execute o seeder para criar os usuários de demonstração:

```bash
cd /home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified
node backend/runSeeders.js
```

Isso criará 3 usuários:
- **admin** / admin123 (role: admin)
- **operador** / op123 (role: operador)
- **caixa** / caixa123 (role: caixa)

---

## 3. Endpoints de Autenticação

### Login
```bash
POST /api/users/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Resposta (201):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "uuid-aqui",
      "username": "admin",
      "name": "Administrador",
      "role": "admin",
      "is_active": true,
      "created_at": "2026-01-21T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Registrar Novo Usuário
```bash
POST /api/users/register
Content-Type: application/json

{
  "username": "novo_usuario",
  "password": "senha_segura",
  "name": "Nome do Usuário",
  "role": "caixa"
}
```

### Obter Dados do Usuário Logado
```bash
GET /api/users/me
Authorization: Bearer <token>
```

### Mudar Senha
```bash
POST /api/users/:id/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "senha_atual",
  "newPassword": "nova_senha"
}
```

---

## 4. Uso do Token

Todas as rotas protegidas requerem o token JWT no header:

```
Authorization: Bearer <seu-token-jwt>
```

Exemplo com curl:
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:3000/api/users/me
```

---

## 5. Middlewares de Autenticação

### Strict (Requer JWT)
```javascript
const authMiddleware = require('./middleware/authMiddleware');
router.use(authMiddleware);
```

**Usar quando:** Produção, APIs privadas

### Flexible (JWT ou Demo Mode)
```javascript
const authMiddlewareFlexible = require('./middleware/authMiddlewareFlexible');
router.use(authMiddlewareFlexible);
```

**Usar quando:** Desenvolvimento com modo demo ativado

---

## 6. Roles e Permissões

### Roles Disponíveis:
- **admin** - Acesso completo a todas as funcionalidades
- **operador** - Acesso a operações principais
- **caixa** - Acesso limitado a caixa/vendas

### Exemplo de Verificação no Controller:
```javascript
if (req.user.role !== 'admin') {
  return res.status(403).json({
    error: 'FORBIDDEN',
    message: 'Acesso negado'
  });
}
```

---

## 7. Modo Demo (Desenvolvimento)

Quando `VITE_DEMO_MODE=true`:
- ✅ Sem necessidade de token
- ✅ Todos os usuários são "admin"
- ✅ Ideal para testes sem autenticação

Quando `VITE_DEMO_MODE=false`:
- ✅ JWT obrigatório
- ✅ Verificação de credenciais real
- ✅ Sistema de autenticação completo

---

## 8. Fluxo de Autenticação Completo

```
1. Frontend: POST /api/users/login
   ├─ Envia: username, password
   └─ Recebe: token JWT

2. Frontend: Armazena token no localStorage

3. Requisições futuras:
   ├─ Header: Authorization: Bearer <token>
   └─ Backend valida JWT
      ├─ Válido → Executa endpoint
      └─ Inválido → 401 Unauthorized

4. Token expira (24h padrão)
   └─ Frontend: Solicita novo login
```

---

## 9. Estrutura do JWT

O token contém os dados:
```javascript
{
  "id": "uuid-usuario",
  "username": "admin",
  "name": "Administrador",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700086400
}
```

Disponível em `req.user` no backend.

---

## 10. Troubleshooting

### "Token não fornecido"
**Solução:** Adicione o header `Authorization: Bearer <token>`

### "Token inválido"
**Solução:** Verifique se `JWT_SECRET` está correto no `.env`

### "Token expirado"
**Solução:** Faça novo login para obter novo token

### "Usuário não encontrado"
**Solução:** Verifique username/password ou rode `node backend/runSeeders.js`

---

## 11. Próximos Passos

- [ ] Atualizar frontend para usar login real
- [ ] Implementar refresh tokens
- [ ] Adicionar 2FA/MFA
- [ ] Sistema de recuperação de senha
- [ ] Auditoria de login/logout

---

## Documentação de Referência

- [JWT.io](https://jwt.io)
- [Express Authentication](http://expressjs.com/en/advanced/best-practice-security.html)
- Arquivo: `backend/models/User.js`
- Arquivo: `backend/controllers/UserController.js`
