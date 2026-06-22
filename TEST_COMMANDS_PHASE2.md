# 🧪 Testes Rápidos - Fase 2 (RBAC)

## ⚡ One-liners para Testar Permissões

### 1️⃣ Admin pode CRIAR produto
```bash
ADMIN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","type":"prato","price":15}' | jq .
```
**Esperado**: 201 Created

### 2️⃣ Caixa NÃO pode CRIAR produto (403 Forbidden)
```bash
CAIXA=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $CAIXA" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","type":"prato","price":15}' | jq .error
```
**Esperado**: "Forbidden"

### 3️⃣ Operador pode LER clientes
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl http://localhost:3000/api/customers \
  -H "Authorization: Bearer $OP" | jq . | head -5
```
**Esperado**: 200 OK com lista de clientes

### 4️⃣ Operador pode CRIAR cliente
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer $OP" \
  -H "Content-Type: application/json" \
  -d '{"nome":"João","sobrenome":"Silva"}' | jq .
```
**Esperado**: 201 Created

### 5️⃣ Operador NÃO pode DELETAR cliente (403 Forbidden)
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl -X DELETE http://localhost:3000/api/customers/1 \
  -H "Authorization: Bearer $OP" | jq .error
```
**Esperado**: "Forbidden"

### 6️⃣ Admin pode DELETAR cliente
```bash
ADMIN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

curl -X DELETE http://localhost:3000/api/customers/1 \
  -H "Authorization: Bearer $ADMIN" | jq .
```
**Esperado**: 200 OK (ou erro se cliente não existe)

### 7️⃣ Caixa pode usar COZINHA
```bash
CAIXA=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

curl http://localhost:3000/api/cozinha/items \
  -H "Authorization: Bearer $CAIXA" | jq . | head -5
```
**Esperado**: 200 OK

---

## 🎯 Teste Completo em 1 minuto

```bash
#!/bin/bash

echo "🧪 Teste Rápido RBAC (1 min)"
echo "============================"

API="http://localhost:3000/api"

# Get tokens
echo "1️⃣ Obter tokens..."
ADMIN=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)
OP=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)
CAIXA=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

echo -n "Admin pode criar produto? "
RESP=$(curl -s -X POST $API/products \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"T","type":"prato","price":1}' \
  -o /dev/null -w "%{http_code}")
[ "$RESP" = "201" ] && echo "✅" || echo "❌"

echo -n "Caixa pode criar produto? "
RESP=$(curl -s -X POST $API/products \
  -H "Authorization: Bearer $CAIXA" \
  -H "Content-Type: application/json" \
  -d '{"name":"T","type":"prato","price":1}' \
  -o /dev/null -w "%{http_code}")
[ "$RESP" = "403" ] && echo "✅ (bloqueado corretamente)" || echo "❌"

echo -n "Operador pode ler clientes? "
RESP=$(curl -s $API/customers \
  -H "Authorization: Bearer $OP" \
  -o /dev/null -w "%{http_code}")
[ "$RESP" = "200" ] && echo "✅" || echo "❌"

echo -n "Caixa pode deletar cliente? "
RESP=$(curl -s -X DELETE $API/customers/1 \
  -H "Authorization: Bearer $CAIXA" \
  -o /dev/null -w "%{http_code}")
[ "$RESP" = "403" ] && echo "✅ (bloqueado corretamente)" || echo "❌"

echo -e "\n✅ Testes concluídos!"
```

---

## 📊 Teste Completo com Script

```bash
chmod +x test-auth-phase2.sh
./test-auth-phase2.sh
```

Esto executará todos os testes de RBAC automaticamente.

---

## 🔍 Ver Headers e Resposta Detalhada

```bash
ADMIN=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

echo "🔍 Testando POST /products com admin"
curl -v -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","type":"prato","price":15}' \
  2>&1 | grep -E "< HTTP|Authorization|error|success"
```

---

## 🚨 Se Algo Falhar

### ❌ Erro: "Cannot POST /products"
- Middleware não foi importado
- Rodar: `grep -n "requireAdmin" backend/routes/products.js`

### ❌ Erro: "User not authenticated"
- req.user não está sendo preenchido
- Verificar: `console.log(req.user)` no middleware

### ❌ Erro: "Forbidden" quando deveria ser "OK"
- Role do token não corresponde
- Verificar token: `echo $TOKEN` e ver se começa com `session_admin_` ou `session_operador_`

### ❌ Erro: 401 quando token existe
- Token não está sendo decodificado
- Verificar decodeSessionToken() em authUnified.js

---

## 💡 Debug: Ver Decodificação do Token

```javascript
// No Node.js REPL ou debug
const token = "session_admin_admin_1_1718892345";
const parts = token.split('_');
console.log({
  role: parts[1],      // "admin"
  id: parts[2],        // "admin_1"
  timestamp: parts[3]  // "1718892345"
});
```

---

## ✅ Checklist de Validação

- [ ] Admin consegue POST /products (201)
- [ ] Operador não consegue POST /products (403)
- [ ] Caixa não consegue POST /products (403)
- [ ] Operador consegue GET /customers (200)
- [ ] Operador consegue POST /customers (201)
- [ ] Operador não consegue DELETE /customers (403)
- [ ] Admin consegue DELETE /customers (200 ou 500)
- [ ] Caixa consegue GET /cozinha/items (200)
- [ ] Sem token retorna 401 em endpoints protegidos

---

## 📞 Comandos Úteis

```bash
# Ver roles no token
TOKEN="session_admin_admin_1_1718892345"
echo $TOKEN | cut -d'_' -f2  # admin

# Testar múltiplos roles
for role in admin operador caixa; do
  echo "Testando $role..."
  TOKEN=$(curl -s http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$role\",\"password\":\"***\"}" | jq -r .token)
  echo "Token: $TOKEN"
done

# Listar todos os endpoints com middleware
grep -r "requireAdmin\|requireOperador\|requireCaixa" backend/routes/

# Ver logs de debug
tail -f backend.log | grep RoleAuth
```

---

**Última atualização**: 2026-06-22  
**Status**: ✅ Pronto para testes
