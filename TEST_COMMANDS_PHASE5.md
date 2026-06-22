# 📋 Comandos de Teste - Fase 5: Auditoria & Monitoramento

Documentação com exemplos práticos de como testar a implementação de auditoria.

---

## 🔐 Pré-requisitos

Ter os tokens dos usuários de teste:

```bash
# Obter token admin
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Guardar o token na variável
ADMIN_TOKEN="session_admin_admin_123456789"
```

---

## 1️⃣ Testes de Logs

### 1.1 Ver todos os logs (últimas 100 requisições)

```bash
curl -X GET "http://localhost:3000/api/audit/logs" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Resposta esperada:
```json
{
  "success": true,
  "count": 50,
  "total": 250,
  "logs": [
    {
      "id": 1,
      "user_id": "admin",
      "user_role": "admin",
      "action": "READ",
      "method": "GET",
      "endpoint": "/api/products",
      "http_status": 200,
      "response_status": "success",
      "duration_ms": 45,
      "timestamp": "2026-06-22T15:30:00Z"
    }
  ]
}
```

---

### 1.2 Filtrar logs por ação

```bash
# Ver apenas operações de CREATE
curl -X GET "http://localhost:3000/api/audit/logs?action=CREATE" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ver apenas operações DELETE
curl -X GET "http://localhost:3000/api/audit/logs?action=DELETE" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 1.3 Filtrar logs por endpoint

```bash
# Ver acessos a /api/products
curl -X GET "http://localhost:3000/api/audit/logs?endpoint=%2Fapi%2Fproducts" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ver acessos a /api/sales
curl -X GET "http://localhost:3000/api/audit/logs?endpoint=%2Fapi%2Fsales" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Dica**: Use `%2F` para `/` em URLs

---

### 1.4 Filtrar por status

```bash
# Ver apenas erros
curl -X GET "http://localhost:3000/api/audit/logs?status=error" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ver apenas sucessos
curl -X GET "http://localhost:3000/api/audit/logs?status=success" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 1.5 Filtrar por data

```bash
# Últimas 24 horas
curl -X GET "http://localhost:3000/api/audit/logs?startDate=2026-06-21" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Período específico
curl -X GET "http://localhost:3000/api/audit/logs?startDate=2026-06-01&endDate=2026-06-30" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 1.6 Limitar número de resultados

```bash
# Ultimos 10 logs
curl -X GET "http://localhost:3000/api/audit/logs?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Últimos 500 logs
curl -X GET "http://localhost:3000/api/audit/logs?limit=500" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 1.7 Obter log específico por ID

```bash
# Ver detalhes de um log específico
curl -X GET "http://localhost:3000/api/audit/logs/123" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 2️⃣ Testes de Eventos de Segurança

### 2.1 Ver todos os eventos de segurança

```bash
curl -X GET "http://localhost:3000/api/audit/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Isso mostrará eventos como 401 (Unauthorized) e 403 (Forbidden).

---

### 2.2 Filtrar por tipo de evento

```bash
# Ver apenas acessos não autorizados (401)
curl -X GET "http://localhost:3000/api/audit/events?eventType=UNAUTHORIZED_ACCESS" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ver apenas acessos proibidos (403)
curl -X GET "http://localhost:3000/api/audit/events?eventType=FORBIDDEN_ACCESS" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 2.3 Filtrar por intervalo de data

```bash
curl -X GET "http://localhost:3000/api/audit/events?startDate=2026-06-20&endDate=2026-06-22" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 2.4 Gerar um evento de segurança (teste)

Para gerar um evento 401 (Unauthorized):

```bash
# Tentar acessar endpoint protegido sem token
curl -X GET "http://localhost:3000/api/audit/logs"

# Tentar com token inválido
curl -X GET "http://localhost:3000/api/audit/logs" \
  -H "Authorization: Bearer token_invalido"
```

Para gerar um evento 403 (Forbidden):

```bash
# Operador tentando acessar rota de admin
curl -X GET "http://localhost:3000/api/audit/logs" \
  -H "Authorization: Bearer $OPERADOR_TOKEN"
```

---

## 3️⃣ Testes de Estatísticas

### 3.1 Estatísticas das últimas 24 horas

```bash
curl -X GET "http://localhost:3000/api/audit/stats?timeRange=24h" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Resposta esperada:
```json
{
  "success": true,
  "timeRange": "24h",
  "stats": {
    "totalRequests": { "count": 1523 },
    "byAction": [
      { "action": "READ", "count": 1200 },
      { "action": "CREATE", "count": 150 },
      { "action": "UPDATE", "count": 120 },
      { "action": "DELETE", "count": 53 }
    ],
    "byStatus": [
      { "response_status": "success", "count": 1450 },
      { "response_status": "error", "count": 73 }
    ],
    "byUser": [
      { "user_id": "admin", "count": 800 },
      { "user_id": "operador_1", "count": 400 }
    ]
  }
}
```

---

### 3.2 Estatísticas da última semana

```bash
curl -X GET "http://localhost:3000/api/audit/stats?timeRange=7d" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 3.3 Estatísticas do último mês

```bash
curl -X GET "http://localhost:3000/api/audit/stats?timeRange=30d" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 4️⃣ Testes de Resumo Geral

### 4.1 Obter resumo completo

```bash
curl -X GET "http://localhost:3000/api/audit/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Resposta esperada inclui:
```json
{
  "success": true,
  "summary": {
    "stats": {
      "totalRequests": { "count": 5000 },
      "successfulRequests": { "count": 4800 },
      "failedRequests": { "count": 200 },
      "securityIncidents": { "count": 12 }
    },
    "topUsers": [
      { "user_id": "admin", "count": 2000 },
      { "user_id": "operador_1", "count": 1500 }
    ],
    "topEndpoints": [
      { "endpoint": "/api/products", "count": 800 },
      { "endpoint": "/api/sales", "count": 600 }
    ],
    "recentActivity": [
      { "user_id": "admin", "action": "READ", "endpoint": "/api/products", ... }
    ]
  }
}
```

---

## 5️⃣ Testes de Usuário Específico

### 5.1 Ver todas as ações de um usuário

```bash
# Ver ações do admin
curl -X GET "http://localhost:3000/api/audit/user/admin" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Ver ações do operador
curl -X GET "http://localhost:3000/api/audit/user/operador_1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 5.2 Com limite de resultados

```bash
curl -X GET "http://localhost:3000/api/audit/user/admin?limit=50" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 6️⃣ Testes de Exportação

### 6.1 Exportar todos os logs em CSV

```bash
curl -X GET "http://localhost:3000/api/audit/export" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > audit_logs.csv
```

---

### 6.2 Exportar com filtros

```bash
# Exportar apenas operações CREATE
curl -X GET "http://localhost:3000/api/audit/export?action=CREATE" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > audit_creates.csv

# Exportar período específico
curl -X GET "http://localhost:3000/api/audit/export?startDate=2026-06-01&endDate=2026-06-30" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  > audit_june.csv
```

---

## 7️⃣ Testes de Limpeza (Cleanup)

### 7.1 Limpar logs com mais de 90 dias

```bash
curl -X POST "http://localhost:3000/api/audit/cleanup" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 90}'
```

Resposta esperada:
```json
{
  "success": true,
  "deletedCount": 1250,
  "message": "Limpeza de logs antigos concluída com sucesso"
}
```

---

### 7.2 Limpar logs com mais de 30 dias (retenção menor)

```bash
curl -X POST "http://localhost:3000/api/audit/cleanup" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 30}'
```

---

## 8️⃣ Testes de Segurança

### 8.1 Validar que operador NÃO pode acessar auditoria

```bash
# Tentar acessar com token de operador
curl -X GET "http://localhost:3000/api/audit/logs" \
  -H "Authorization: Bearer $OPERADOR_TOKEN"
```

Resposta esperada: **403 Forbidden**

```json
{
  "success": false,
  "message": "Acesso negado. Apenas administradores podem acessar auditoria."
}
```

---

### 8.2 Validar que caixa NÃO pode acessar auditoria

```bash
curl -X GET "http://localhost:3000/api/audit/logs" \
  -H "Authorization: Bearer $CAIXA_TOKEN"
```

Resposta esperada: **403 Forbidden**

---

### 8.3 Validar que sem token NÃO pode acessar

```bash
curl -X GET "http://localhost:3000/api/audit/logs"
```

Resposta esperada: **401 Unauthorized**

---

## 9️⃣ Testes de Dados

### 9.1 Gerar múltiplas requisições para ter dados

```bash
# Criar um loop de requisições
for i in {1..10}; do
  curl -s "$BASE_URL/api/products" \
    -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
  echo "Requisição $i enviada"
  sleep 0.5
done

echo "Aguardando 2 segundos..."
sleep 2

# Agora consultar os logs
curl -X GET "http://localhost:3000/api/audit/logs?limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### 9.2 Gerar requisições com status de erro

```bash
# Criar um produto (sucesso)
curl -X POST "http://localhost:3000/api/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste","price":10}'

# Tentar com dados inválidos (erro)
curl -X POST "http://localhost:3000/api/products" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Consultar estatísticas
curl -X GET "http://localhost:3000/api/audit/stats?timeRange=24h" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## 🔟 Script de Teste Automático

### 10.1 Executar todos os testes

```bash
bash test-auth-phase5.sh
```

Isso executará:
- ✅ Login com diferentes roles
- ✅ Geração de logs
- ✅ Testes de segurança (401/403)
- ✅ Acesso a rotas de auditoria (admin only)
- ✅ Filtros de logs
- ✅ Eventos de segurança
- ✅ Estatísticas
- ✅ Exportação CSV
- ✅ Limpeza de logs

---

## 📊 Verificações Esperadas

Para validar que tudo está funcionando corretamente:

- ✅ `/api/audit/logs` retorna array de logs
- ✅ `/api/audit/events` retorna eventos de segurança
- ✅ `/api/audit/stats` retorna estatísticas válidas
- ✅ `/api/audit/summary` retorna resumo com usuários e endpoints
- ✅ `/api/audit/export` retorna CSV válido
- ✅ `/api/audit/cleanup` remove logs antigos
- ✅ Operador não consegue acessar `/api/audit/*` (403)
- ✅ Não-autenticado não consegue acessar (401)
- ✅ Todos os logs contêm user_id, timestamp, action
- ✅ Eventos 401/403 são registrados em security_audit_events

---

## 🎯 Conclusão

A Fase 5 implementa um sistema completo de auditoria que:
- 📋 Registra TODAS as requisições HTTP
- 🔒 Rastreia eventos de segurança (401/403)
- 📊 Fornece estatísticas em tempo real
- 👤 Identifica quem fez o quê, quando
- ✅ Permite compliance e conformidade regulatória
- 🗑️ Implementa retenção automática de dados

Use estes comandos para validar e monitorar a segurança do sistema!
