#!/bin/bash

# 🧪 Testes Fase 3 - Informações Sensíveis (requireOperador)
# Valida se proteção de informações sensíveis está funcionando

API_BASE="http://localhost:3000/api"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

echo -e "${YELLOW}🧪 TESTE FASE 3 - INFORMAÇÕES SENSÍVEIS (requireOperador)${NC}\n"

# ============================================
# Obter tokens para cada role
# ============================================
echo -e "${YELLOW}[SETUP] Obtendo tokens...${NC}"

ADMIN_TOKEN=$(curl -s "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .token)

OPERADOR_TOKEN=$(curl -s "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"operador","password":"op123"}' | jq -r .token)

CAIXA_TOKEN=$(curl -s "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"caixa","password":"caixa123"}' | jq -r .token)

echo -e "${GREEN}✅ Tokens obtidos\n${NC}"

# ============================================
# Função para testar acesso
# ============================================
test_access() {
  local name=$1
  local method=$2
  local endpoint=$3
  local token=$4
  local expected=$5
  local body=$6
  
  local cmd="curl -s -X $method $API_BASE$endpoint"
  [ -n "$token" ] && cmd="$cmd -H 'Authorization: Bearer $token'"
  [ -n "$body" ] && cmd="$cmd -H 'Content-Type: application/json' -d '$body'"
  
  local actual=$(eval "$cmd -o /dev/null -w '%{http_code}'")
  
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}✅ $name (HTTP $actual)${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ $name (esperado $expected, recebido $actual)${NC}"
    ((FAIL++))
  fi
}

# ============================================
# TESTES: REPORTS
# ============================================
echo -e "${BLUE}[REPORTS - GET endpoints]${NC}"
test_access "Admin pode ler reports" GET "/reports/stock-stats" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler reports" GET "/reports/stock-stats" "$OPERADOR_TOKEN" "200"
test_access "Caixa NÃO pode ler reports" GET "/reports/stock-stats" "$CAIXA_TOKEN" "403"
test_access "Visitante NÃO pode ler reports" GET "/reports/stock-stats" "" "401"

test_access "Admin pode ler low-stock" GET "/reports/low-stock" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler low-stock" GET "/reports/low-stock" "$OPERADOR_TOKEN" "200"

# ============================================
# TESTES: STOCK
# ============================================
echo -e "\n${BLUE}[STOCK - GET endpoints]${NC}"
test_access "Admin pode ler stock alerts" GET "/stock/alerts" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler stock alerts" GET "/stock/alerts" "$OPERADOR_TOKEN" "200"
test_access "Caixa NÃO pode ler stock alerts" GET "/stock/alerts" "$CAIXA_TOKEN" "403"

test_access "Admin pode ler stock stats" GET "/stock/stats" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler stock stats" GET "/stock/stats" "$OPERADOR_TOKEN" "200"

echo -e "\n${BLUE}[STOCK - Ajustes]${NC}"
test_access "Admin pode ajustar estoque" PUT "/stock/1/adjust" "$ADMIN_TOKEN" "400" '{"newStock":10}'
test_access "Operador pode ajustar estoque" PUT "/stock/1/adjust" "$OPERADOR_TOKEN" "400" '{"newStock":10}'
test_access "Caixa NÃO pode ajustar" PUT "/stock/1/adjust" "$CAIXA_TOKEN" "403" '{"newStock":10}'

# ============================================
# TESTES: PRODUCTION
# ============================================
echo -e "\n${BLUE}[PRODUCTION - GET endpoints]${NC}"
test_access "Admin pode ver disponíveis" GET "/production/available" "$ADMIN_TOKEN" "200"
test_access "Operador pode ver disponíveis" GET "/production/available" "$OPERADOR_TOKEN" "200"
test_access "Caixa NÃO pode ver disponíveis" GET "/production/available" "$CAIXA_TOKEN" "403"

test_access "Admin pode ver histórico" GET "/production/history" "$ADMIN_TOKEN" "200"
test_access "Operador pode ver histórico" GET "/production/history" "$OPERADOR_TOKEN" "200"

echo -e "\n${BLUE}[PRODUCTION - Produção]${NC}"
test_access "Admin pode produzir" POST "/production/produce" "$ADMIN_TOKEN" "400" '{"productId":"1","quantity":1}'
test_access "Operador pode produzir" POST "/production/produce" "$OPERADOR_TOKEN" "400" '{"productId":"1","quantity":1}'
test_access "Caixa NÃO pode produzir" POST "/production/produce" "$CAIXA_TOKEN" "403" '{"productId":"1","quantity":1}'

# ============================================
# TESTES: COMANDAS (requireAuth)
# ============================================
echo -e "\n${BLUE}[COMANDAS - GET (requireAuth)]${NC}"
test_access "Admin pode listar comandas" GET "/comandas" "$ADMIN_TOKEN" "200"
test_access "Operador pode listar comandas" GET "/comandas" "$OPERADOR_TOKEN" "200"
test_access "Caixa PODE listar comandas" GET "/comandas" "$CAIXA_TOKEN" "200"
test_access "Visitante NÃO pode listar" GET "/comandas" "" "401"

# ============================================
# TESTES: UPLOAD (requireAuth)
# ============================================
echo -e "\n${BLUE}[UPLOAD - POST (requireAuth)]${NC}"
# Nota: upload requer multipart/form-data, então testamos sem arquivo
test_access "Caixa acesso negado sem arquivo" POST "/upload" "$CAIXA_TOKEN" "400"
test_access "Operador acesso negado sem arquivo" POST "/upload" "$OPERADOR_TOKEN" "400"
test_access "Visitante acesso negado" POST "/upload" "" "401"

# ============================================
# RESULTADO
# ============================================
echo -e "\n${YELLOW}📊 RESULTADO${NC}"
echo -e "Testes aprovados: ${GREEN}$PASS${NC}"
echo -e "Testes falhados: ${RED}$FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "\n${GREEN}✅ FASE 3 - TESTES APROVADOS!${NC}\n"
  exit 0
else
  echo -e "\n${RED}❌ FASE 3 - ALGUNS TESTES FALHARAM${NC}\n"
  exit 1
fi
