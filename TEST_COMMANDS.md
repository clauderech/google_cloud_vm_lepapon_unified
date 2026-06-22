# 🧪 Testes Rápidos - Fase 1

## ⚡ One-liners para Testar Tudo

### 1️⃣ Obter Token de Teste
```bash
curl -s http://localhost:3000/api/auth/test-token | jq .token -r
```

### 2️⃣ Verificar que endpoint REJEITA sem token
```bash
echo "❌ Esperado: 401 Unauthorized"
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/sales | head -1
```

### 3️⃣ Verificar que endpoint ACEITA com token
```bash
TOKEN=$(curl -s http://localhost:3000/api/auth/test-token | jq .token -r)
echo "✅ Esperado: 200 OK"
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/sales \
  -H "Authorization: Bearer $TOKEN" | head -1
```

### 4️⃣ Testar Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq .
```

### 5️⃣ Testar Webhook SEM Token (deve falhar)
```bash
echo "❌ Esperado: 401"
curl -s -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{}' | jq .error
```

### 6️⃣ Testar Webhook COM Token (deve passar)
```bash
TOKEN=$(curl -s http://localhost:3000/api/auth/test-token | jq .token -r)
echo "✅ Token: $TOKEN"
curl -s -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"test":"data"}' | jq .
```

---

## 🎯 Teste Completo em 30 segundos

```bash
#!/bin/bash
set -e

echo "🧪 TESTE RÁPIDO FASE 1"
echo "=====================\n"

# Get token
echo "1️⃣  Obtendo token..."
TOKEN=$(curl -s http://localhost:3000/api/auth/test-token | jq -r .token)
echo "   ✅ Token: ${TOKEN:0:30}..."

# Test webhook rejection
echo "\n2️⃣  Testando webhook SEM token (deve falhar)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/webhook -d '{}')
if [ "$STATUS" = "401" ]; then echo "   ✅ Corretamente rejeitado"; else echo "   ❌ Falhou: HTTP $STATUS"; fi

# Test sales rejection
echo "\n3️⃣  Testando sales SEM token (deve falhar)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sales)
if [ "$STATUS" = "401" ]; then echo "   ✅ Corretamente rejeitado"; else echo "   ❌ Falhou: HTTP $STATUS"; fi

# Test sales acceptance
echo "\n4️⃣  Testando sales COM token (deve aceitar)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sales \
  -H "Authorization: Bearer $TOKEN")
if [ "$STATUS" != "401" ]; then echo "   ✅ Aceito"; else echo "   ❌ Falhou: HTTP $STATUS"; fi

echo "\n✅ FASE 1 STATUS: OK"
```

---

## 📊 Teste Completo com Relatório

```bash
#!/bin/bash

API="http://localhost:3000/api"
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local token=$4
  local expected_code=$5
  
  local cmd="curl -s -X $method $API$endpoint"
  [ -n "$token" ] && cmd="$cmd -H 'Authorization: Bearer $token'"
  
  local actual_code=$(eval "$cmd -o /dev/null -w '%{http_code}'")
  
  if [ "$actual_code" = "$expected_code" ]; then
    echo "✅ $name (HTTP $actual_code)"
    ((PASS++))
  else
    echo "❌ $name (esperado $expected_code, recebido $actual_code)"
    ((FAIL++))
  fi
}

echo "🧪 TESTE COMPLETO FASE 1\n"

# Get token
TOKEN=$(curl -s $API/auth/test-token | jq -r .token)
echo "Token: $TOKEN\n"

# Tests
test_endpoint "Sales sem token" GET "/sales" "" "401"
test_endpoint "Sales com token" GET "/sales" "$TOKEN" "200"
test_endpoint "Purchases sem token" GET "/purchases" "" "401"
test_endpoint "Purchases com token" GET "/purchases" "$TOKEN" "200"
test_endpoint "Webhook sem token" POST "/webhook" "" "401"
test_endpoint "Webhook com WhatsApp token" POST "/webhook" "$WHATSAPP_API_TOKEN" "200"

echo "\n📊 RESULTADO: $PASS passou, $FAIL falhou"
[ $FAIL -eq 0 ] && echo "✅ Todos os testes passaram!" || echo "❌ Alguns testes falharam"
```

---

## 🔍 Debug - Ver Headers e Response

```bash
TOKEN=$(curl -s http://localhost:3000/api/auth/test-token | jq -r .token)

echo "🔍 Testando endpoint /sales com headers verbose"
curl -v http://localhost:3000/api/sales \
  -H "Authorization: Bearer $TOKEN" \
  2>&1 | grep -E "< HTTP|< Authorization|^{"
```

---

## 📱 Teste via Frontend (Browser Console)

```javascript
// Abrir DevTools (F12) → Console → colar:

// 1. Obter token
const tokenResp = await fetch('/api/auth/test-token');
const token = (await tokenResp.json()).token;
console.log('Token:', token);

// 2. Teste sem token (deve falhar)
const test1 = await fetch('/api/sales');
console.log('Sem token:', test1.status); // 401

// 3. Teste com token (deve funcionar)
const test2 = await fetch('/api/sales', {
  headers: { 'Authorization': `Bearer ${token}` }
});
console.log('Com token:', test2.status); // 200

// 4. Ver dados
const data = await test2.json();
console.log('Dados:', data);
```

---

## 🚨 Se Algo Falhar

### ❌ Erro: "Cannot POST /webhook"
- Verificar se middleware está aplicado
- Rodar: `grep -n "requireWhatsappAuth" backend/routes/webhook-whatsapp-meta.js`

### ❌ Erro: "Syntax error in authUnified.js"
- Rodar: `node -c backend/middleware/authUnified.js`

### ❌ Erro: "Auth route not found"
- Verificar se route foi registrada em app.js
- Rodar: `grep -n "app.use.*auth" backend/app.js`

### ❌ Erro: Token não sendo enviado
- Verificar localStorage: `localStorage.getItem('lanchonete_auth_token')`
- Verificar headers: DevTools → Network → verificar Authorization

---

## ✅ Checklist de Validação

- [ ] Rota `/api/auth/test-token` retorna token válido
- [ ] POST `/api/webhook` retorna 401 sem token
- [ ] GET `/api/sales` retorna 401 sem token
- [ ] GET `/api/purchases` retorna 401 sem token
- [ ] POST `/api/cash-register/open` retorna 401 sem token
- [ ] POST `/api/cash-register/close` retorna 401 sem token
- [ ] Endpoints aceitam requisições com token válido
- [ ] Login via `/api/auth/login` funciona
- [ ] Frontend envia token automaticamente
- [ ] DevTools mostra Authorization header

---

## 📞 Comandos Úteis

```bash
# Ver todos os endpoints
grep -r "router\." backend/routes/ | grep "post\|get\|put\|delete"

# Verificar se middleware está importado
grep -r "requireAuth" backend/routes/

# Testar sintaxe de todos os arquivos
find backend -name "*.js" -exec node -c {} \;

# Ver logs em tempo real
tail -f backend.log | grep -i auth
```

---

**Última atualização**: 2026-06-22  
**Status**: ✅ Pronto para testes
