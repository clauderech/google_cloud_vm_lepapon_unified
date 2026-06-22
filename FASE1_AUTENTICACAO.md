# 🔐 Fase 1 - Segurança Crítica: IMPLEMENTADO

## ✅ O que foi implementado

### 1. Middleware de Autenticação Expandido
**Arquivo**: `backend/middleware/authUnified.js`

Novas funções adicionadas:
- `requireAuth()` - Valida qualquer credencial (frontend session, WhatsApp token, API Key)
- `requireWhatsappAuth()` - Valida apenas WhatsApp token (para webhooks)

### 2. Endpoints Protegidos

| Rota | Método | Proteção | Status |
|------|--------|----------|--------|
| `/api/webhook` | POST | WhatsApp Token | ✅ |
| `/api/cash-register/open` | POST | Token genérico | ✅ |
| `/api/cash-register/close` | POST | Token genérico | ✅ |
| `/api/sales` | GET/POST/DELETE | Token genérico | ✅ |
| `/api/purchases` | GET/POST/DELETE | Token genérico | ✅ |

### 3. Endpoint de Autenticação
**Arquivo**: `backend/routes/auth.js`

Novos endpoints:
- `POST /api/auth/login` - Gera token de sessão
- `POST /api/auth/logout` - Finaliza sessão
- `GET /api/auth/demo-users` - Lista usuários de teste
- `GET /api/auth/test-token` - Retorna token de teste (dev only)

---

## 🧪 Como Testar

### Opção 1: Script Automatizado
```bash
# Tornar executável
chmod +x test-auth-phase1.sh

# Rodar testes
./test-auth-phase1.sh
```

### Opção 2: Testes Manuais com cURL

#### 1. Obter token de teste
```bash
curl http://localhost:3000/api/auth/test-token
# Resposta:
# {
#   "token": "session_admin_admin_1_1234567890",
#   "usage": "Authorization: Bearer session_admin_admin_1_1234567890",
#   "expires": "Nesta sessão (Fase 4: será JWT com expiração)"
# }
```

#### 2. Testar webhook SEM autenticação (deve falhar)
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
# Resposta esperada: 401 Unauthorized
```

#### 3. Testar webhook COM autenticação (deve funcionar)
```bash
TOKEN="session_admin_admin_1_1234567890"  # Usar token real
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"test":"data"}'
# Resposta: deve processar o webhook
```

#### 4. Testar sales SEM autenticação (deve falhar)
```bash
curl http://localhost:3000/api/sales
# Resposta esperada: 401 Unauthorized
```

#### 5. Testar sales COM autenticação (deve funcionar)
```bash
TOKEN="session_admin_admin_1_1234567890"  # Usar token real
curl http://localhost:3000/api/sales \
  -H "Authorization: Bearer $TOKEN"
# Resposta: lista de vendas
```

#### 6. Testar login com credenciais
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
# Resposta:
# {
#   "success": true,
#   "token": "session_admin_admin_1_1708456789",
#   "user": {
#     "id": "admin_1",
#     "name": "Administrador",
#     "role": "admin",
#     "loginAt": "2025-06-22T10:30:00.000Z"
#   }
# }
```

---

## 👥 Usuários de Teste Disponíveis

| Username | Password | Role | ID |
|----------|----------|------|-----|
| admin | admin123 | admin | admin_1 |
| operador | op123 | operador | op_1 |
| caixa | caixa123 | caixa | caixa_1 |

```bash
# Listar usuários disponíveis
curl http://localhost:3000/api/auth/demo-users
```

---

## 🔄 Fluxo de Autenticação Recomendado

### Frontend (React)
1. Usuário insere credenciais no Login
2. Frontend chama `POST /api/auth/login` com username + password
3. Backend retorna token + user info
4. Frontend armazena token no localStorage
5. Frontend inclui token em todas as requisições: `Authorization: Bearer {token}`

### WhatsApp Webhook
1. Meta envia evento para `POST /api/webhook`
2. Request contém `Authorization: Bearer {WHATSAPP_API_TOKEN}` (configurado em .env)
3. Middleware valida token
4. Se válido, webhook é processado
5. Se inválido, retorna 401

---

## 🚀 Próximos Passos (Fase 2)

- [ ] Atualizar frontend para enviar tokens
- [ ] Criar middleware role-based (requireAdmin, requireOperador, etc)
- [ ] Proteger mais endpoints com regras de permissão
- [ ] Implementar JWT para Fase 4

---

## ⚠️ Notas Importantes

1. **Tokens Simples (Fase 1)**: Baseados em string simples para debug
2. **Sem Expiração (Fase 1)**: Tokens válidos indefinidamente
3. **Dev Mode Desativado**: Todos os endpoints requerem autenticação real
4. **Hash de Senha**: Não implementado (apenas demo, usar bcrypt em produção)
5. **JWT**: Será implementado na Fase 4

---

## 📊 Resultado Esperado

```
✅ Webhook: Protegido
✅ Sales: Protegido
✅ Purchases: Protegido
✅ Cash Register: Protegido
```

Nenhuma rota crítica aceita requisições sem autenticação válida.

---

## 🔗 Endpoints de Referência

### Autenticação (Pública)
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/demo-users`
- `GET /api/auth/test-token` (dev only)

### Protegidos (Requerem token)
- `POST /api/webhook` (WhatsApp)
- `POST /api/cash-register/open`
- `POST /api/cash-register/close`
- `GET /api/sales`
- `POST /api/sales`
- `DELETE /api/sales/:id`
- `GET /api/purchases`
- `POST /api/purchases`
- `DELETE /api/purchases/:id`
