# 🚀 Guia de Teste - FASE 4 (Autenticação Real)

## Pré-requisitos

✅ Banco de dados MySQL rodando
✅ Node.js com dependências instaladas
✅ Servidor backend parado (para iniciar com novas configurações)

---

## Passo 1: Atualizar Variáveis de Ambiente

Verifique se `.env.local` foi atualizado com:

```env
JWT_SECRET=sua-chave-secreta-aqui-mude-em-producao
JWT_EXPIRES_IN=24h
PASSWORD_SALT=default-salt-mude-em-producao
VITE_DEMO_MODE=false
```

---

## Passo 2: Executar o Seeder de Usuários

Crie os usuários de teste:

```bash
cd /home/claus/Projetos/google_cloud/google_cloud_vm_lepapon_unified
node backend/runSeeders.js
```

**Esperado:**
```
[Seeder] Iniciando seeder de usuários...
[Seeder] Usuário criado: admin (admin)
[Seeder] Usuário criado: operador (operador)
[Seeder] Usuário criado: caixa (caixa)
[Seeder] Seeder concluído com sucesso
```

---

## Passo 3: Iniciar o Servidor

```bash
npm run dev
# ou
node backend/app.js
```

**Esperado:**
```
Server iniciado na porta 3000
[DB] Conectado ao banco de dados lepapon_unified_db
```

---

## Passo 4: Testar Autenticação com Script

```bash
node backend/testAuth.js
```

**Esperado:**
```
🔐 Testando Autenticação JWT

1️⃣  Fazendo login com admin...
✅ Login realizado com sucesso
   Usuário: Administrador (admin)
   Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

2️⃣  Acessando /api/users/me com token...
✅ Dados do usuário obtidos com sucesso
   ...

🎉 Todos os testes passaram com sucesso!
```

---

## Passo 5: Testar Manualmente com cURL

### Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "...",
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

### Usar Token
```bash
# Copie o token da resposta anterior
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Fazer requisição autenticada
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Listar Usuários
```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## Passo 6: Testar Endpoints de Novos Modelos

### Criar Comanda
```bash
curl -X POST http://localhost:3000/api/comandas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "João Silva",
    "tableNumber": "5"
  }'
```

### Listar Comandas Abertas
```bash
curl http://localhost:3000/api/comandas/open \
  -H "Authorization: Bearer $TOKEN"
```

### Criar Movimento de Estoque
```bash
curl -X POST http://localhost:3000/api/stock-movements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "1",
    "movementType": "entrada",
    "quantity": 10,
    "previousStock": 5,
    "newStock": 15,
    "referenceType": "purchase",
    "referenceId": "purchase-123"
  }'
```

---

## Passo 7: Testar Diferentes Roles

### Login como Operador
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "operador",
    "password": "op123"
  }'
```

### Login como Caixa
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "caixa",
    "password": "caixa123"
  }'
```

---

## Passo 8: Modo Demo vs. Autenticação Real

### Testar com Modo Demo Ativado
```bash
# Edite .env.local
VITE_DEMO_MODE=true

# Restart server
npm run dev
```

Agora pode fazer requisições SEM token:
```bash
curl http://localhost:3000/api/comandas/open
# Funcionará mesmo sem Authorization header
```

### Voltar para Autenticação Real
```bash
# Edite .env.local
VITE_DEMO_MODE=false

# Restart server
npm run dev
```

Agora token é obrigatório.

---

## Checklist ✅

- [ ] `.env.local` atualizado com JWT_SECRET e PASSWORD_SALT
- [ ] Seeder executado com sucesso (3 usuários criados)
- [ ] Servidor iniciou sem erros
- [ ] Script `testAuth.js` passou em todos os testes
- [ ] Login via cURL funcionou
- [ ] Token JWT foi gerado corretamente
- [ ] Endpoints protegidos rejeitam requisições sem token
- [ ] Diferentes roles fazem login com sucesso

---

## Próximos Passos

1. **FASE 5:** Atualizar frontend para consumir endpoint `/api/users/login`
2. Armazenar token no localStorage do frontend
3. Usar token em todas as requisições autenticadas
4. Implementar logout no frontend

---

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "ECONNREFUSED" | Servidor não está rodando. Execute `npm run dev` |
| "Token não fornecido" | Adicione header `Authorization: Bearer <token>` |
| "Token inválido" | Verifique se `JWT_SECRET` está correto no `.env` |
| "Usuário não encontrado" | Execute `node backend/runSeeders.js` para criar usuários |
| "Cannot find module" | Execute `npm install` para instalar dependências |

---

**Sucesso! 🎉** Autenticação JWT está funcionando!
