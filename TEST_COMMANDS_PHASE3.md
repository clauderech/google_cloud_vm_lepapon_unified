# 🧪 Testes Rápidos - Fase 3 (Informações Sensíveis)

## ⚡ One-liners para Testar requireOperador

### 1️⃣ Operador PODE ver relatórios
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl http://localhost:3000/api/reports/stock-stats \
  -H "Authorization: Bearer $OP" | jq .
```
**Esperado**: 200 OK com dados

---

### 2️⃣ Caixa NÃO PODE ver relatórios (403 Forbidden)
```bash
CAIXA=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

curl http://localhost:3000/api/reports/stock-stats \
  -H "Authorization: Bearer $CAIXA" | jq .
```
**Esperado**: "Forbidden" ou erro 403

---

### 3️⃣ Operador PODE ajustar estoque
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl -X PUT http://localhost:3000/api/stock/1/adjust \
  -H "Authorization: Bearer $OP" \
  -H "Content-Type: application/json" \
  -d '{"newStock":100}' | jq .
```
**Esperado**: 200 OK ou erro esperado do sistema (não 403)

---

### 4️⃣ Caixa NÃO PODE ajustar estoque (403)
```bash
CAIXA=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

curl -X PUT http://localhost:3000/api/stock/1/adjust \
  -H "Authorization: Bearer $CAIXA" \
  -H "Content-Type: application/json" \
  -d '{"newStock":100}' | jq .
```
**Esperado**: "Forbidden" (403)

---

### 5️⃣ Operador PODE ver histórico de produção
```bash
OP=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

curl http://localhost:3000/api/production/history \
  -H "Authorization: Bearer $OP" | jq .
```
**Esperado**: 200 OK

---

### 6️⃣ Caixa PODE ver comandas (requireAuth)
```bash
CAIXA=$(curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

curl http://localhost:3000/api/comandas \
  -H "Authorization: Bearer $CAIXA" | jq . | head -5
```
**Esperado**: 200 OK com dados

---

### 7️⃣ Visitante NÃO PODE ver comandas (401)
```bash
curl http://localhost:3000/api/comandas | jq .
```
**Esperado**: "Unauthorized" ou erro 401

---

## 🎯 Teste Completo em 1 minuto

```bash
#!/bin/bash
echo "🧪 Teste Rápido Fase 3 (1 min)"
echo "=============================="

API="http://localhost:3000/api"

# Get tokens
ADMIN=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)
OP=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)
CAIXA=$(curl -s $API/auth/login -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

echo -n "1️⃣  Operador pode ver reports? "
RESP=$(curl -s $API/reports/stock-stats \
  -H "Authorization: Bearer $OP" -o /dev/null -w "%{http_code}")
[ "$RESP" = "200" ] && echo "✅" || echo "❌"

echo -n "2️⃣  Caixa NÃO pode ver reports? "
RESP=$(curl -s $API/reports/stock-stats \
  -H "Authorization: Bearer $CAIXA" -o /dev/null -w "%{http_code}")
[ "$RESP" = "403" ] && echo "✅ (bloqueado)" || echo "❌"

echo -n "3️⃣  Operador pode ajustar estoque? "
RESP=$(curl -s -X PUT $API/stock/1/adjust \
  -H "Authorization: Bearer $OP" \
  -H "Content-Type: application/json" \
  -d '{"newStock":10}' -o /dev/null -w "%{http_code}")
[ "$RESP" != "403" ] && echo "✅" || echo "❌"

echo -n "4️⃣  Caixa pode ver comandas? "
RESP=$(curl -s $API/comandas \
  -H "Authorization: Bearer $CAIXA" -o /dev/null -w "%{http_code}")
[ "$RESP" = "200" ] && echo "✅" || echo "❌"

echo -n "5️⃣  Visitante NÃO pode ver comandas? "
RESP=$(curl -s $API/comandas -o /dev/null -w "%{http_code}")
[ "$RESP" = "401" ] && echo "✅ (bloqueado)" || echo "❌"

echo -e "\n✅ Testes concluídos!"
```

---

## 📊 Teste com Script Completo

```bash
chmod +x test-auth-phase3.sh
./test-auth-phase3.sh
```

Executará todos os testes de forma automatizada.

---

## 🔍 Endpoints Protegidos - Fase 3

### Reports (requireOperador)
```
GET /api/reports/low-stock
GET /api/reports/stock-stats
GET /api/reports/stock-movements/:productId
GET /api/reports/sales-by-product
```

### Stock (requireOperador)
```
GET /api/stock/:productId/movements
GET /api/stock/alerts
GET /api/stock/stats
GET /api/stock/consistency
GET /api/stock/movements
PUT /api/stock/:productId/adjust
POST /api/stock/sync/whatsapp
POST /api/stock/:productId/sync/whatsapp
```

### Production (requireOperador)
```
GET /api/production/available
GET /api/production/history
POST /api/production/produce
```

### Comandas (requireAuth)
```
GET /api/comandas
GET /api/comandas/:id
```

### Upload (requireAuth)
```
POST /api/upload
```

---

## 🚨 Se Algo Falhar

### ❌ Erro: "Forbidden" quando deveria ser OK
- Verificar se o token é de operador: `echo $OP | cut -d'_' -f2`
- Deve ser: `operador`

### ❌ Erro: 404 Not Found
- Rota pode não existir ainda
- Verificar se arquivos estão salvos: `ls -la backend/routes/`

### ❌ Erro: "Cannot POST /api/reports/*"
- requireOperador não foi importado
- Verificar: `grep -n "requireOperador" backend/routes/reports.js`

### ❌ Erro: "Module not found"
- Verificar caminho do middleware:
```bash
ls -la backend/middleware/roleAuth.js
ls -la backend/middleware/authUnified.js
```

---

## 💡 Debug: Ver Decodificação do Token

```bash
TOKEN="session_operador_operador_1_1718892345"
echo "Role: $(echo $TOKEN | cut -d'_' -f2)"
echo "ID: $(echo $TOKEN | cut -d'_' -f3)"
```

---

## ✅ Checklist de Validação - Fase 3

- [ ] Operador consegue GET /reports/* (200)
- [ ] Caixa não consegue GET /reports/* (403)
- [ ] Operador consegue PUT /stock/:id/adjust (200 ou erro esperado, não 403)
- [ ] Caixa não consegue PUT /stock/:id/adjust (403)
- [ ] Operador consegue POST /production/produce (200 ou erro esperado)
- [ ] Caixa não consegue POST /production/produce (403)
- [ ] Caixa consegue GET /comandas (200)
- [ ] Visitante não consegue GET /comandas (401)
- [ ] Caixa consegue POST /upload (400 sem arquivo, não 403)
- [ ] Visitante não consegue POST /upload (401)

---

## 📞 Comandos Úteis

```bash
# Listar todos os endpoints protegidos
grep -r "requireOperador\|requireAuth" backend/routes/

# Contar rotas por proteção
echo "requireOperador:"
grep -r "requireOperador" backend/routes/ | wc -l
echo "requireAuth:"
grep -r "requireAuth" backend/routes/ | wc -l

# Ver histórico de modificações
git diff HEAD~5 backend/routes/

# Testar sintaxe de todos os arquivos
for file in backend/routes/*.js; do
  echo "Testando $file..."
  node -c "$file" || echo "ERRO em $file"
done
```

---

**Última atualização**: 2026-06-22  
**Status**: ✅ Pronto para testes

Próxima etapa: Fase 4 - Integração Frontend (botões com permissões, mensagens de erro, etc)
