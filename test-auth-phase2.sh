#!/bin/bash

# 🧪 Testes Fase 2 - Controle de Acesso Baseado em Roles (RBAC)
# Valida se permissões estão funcionando corretamente

API_BASE="http://localhost:3000/api"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

echo -e "${YELLOW}🧪 TESTE FASE 2 - CONTROLE DE ACESSO (RBAC)${NC}\n"

# ============================================
# Obter tokens para cada role
# ============================================
echo -e "${YELLOW}[SETUP] Obtendo tokens para cada role...${NC}"

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
# TESTES: PRODUTOS
# ============================================
echo -e "${BLUE}[PRODUTOS]${NC}"
test_access "Admin pode criar produto" POST "/products" "$ADMIN_TOKEN" "201" '{"name":"Test","type":"prato","price":10}'
test_access "Operador NÃO pode criar produto" POST "/products" "$OPERADOR_TOKEN" "403" '{"name":"Test","type":"prato","price":10}'
test_access "Caixa NÃO pode criar produto" POST "/products" "$CAIXA_TOKEN" "403" '{"name":"Test","type":"prato","price":10}'
test_access "Visitante NÃO pode criar produto" POST "/products" "" "401" '{"name":"Test","type":"prato","price":10}'

# ============================================
# TESTES: FORNECEDORES
# ============================================
echo -e "\n${BLUE}[FORNECEDORES]${NC}"
test_access "Admin pode criar fornecedor" POST "/suppliers" "$ADMIN_TOKEN" "201" '{"name":"Supplier"}'
test_access "Operador NÃO pode criar fornecedor" POST "/suppliers" "$OPERADOR_TOKEN" "403" '{"name":"Supplier"}'
test_access "Caixa NÃO pode criar fornecedor" POST "/suppliers" "$CAIXA_TOKEN" "403" '{"name":"Supplier"}'

# ============================================
# TESTES: CLIENTES
# ============================================
echo -e "\n${BLUE}[CLIENTES]${NC}"
test_access "Admin pode ler clientes" GET "/customers" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler clientes" GET "/customers" "$OPERADOR_TOKEN" "200"
test_access "Caixa pode ler clientes" GET "/customers" "$CAIXA_TOKEN" "200"
test_access "Visitante NÃO pode ler clientes" GET "/customers" "" "401"

test_access "Admin pode criar cliente" POST "/customers" "$ADMIN_TOKEN" "201" '{"nome":"Test","sobrenome":"Silva"}'
test_access "Operador pode criar cliente" POST "/customers" "$OPERADOR_TOKEN" "201" '{"nome":"Test","sobrenome":"Silva"}'
test_access "Caixa pode criar cliente" POST "/customers" "$CAIXA_TOKEN" "201" '{"nome":"Test","sobrenome":"Silva"}'

test_access "Admin pode deletar cliente" DELETE "/customers/999" "$ADMIN_TOKEN" "500"
test_access "Operador NÃO pode deletar cliente" DELETE "/customers/999" "$OPERADOR_TOKEN" "403"
test_access "Caixa NÃO pode deletar cliente" DELETE "/customers/999" "$CAIXA_TOKEN" "403"

# ============================================
# TESTES: COZINHA
# ============================================
echo -e "\n${BLUE}[COZINHA]${NC}"
test_access "Admin pode ler itens cozinha" GET "/cozinha/items" "$ADMIN_TOKEN" "200"
test_access "Operador pode ler itens cozinha" GET "/cozinha/items" "$OPERADOR_TOKEN" "200"
test_access "Caixa pode ler itens cozinha" GET "/cozinha/items" "$CAIXA_TOKEN" "200"
test_access "Visitante NÃO pode ler itens cozinha" GET "/cozinha/items" "" "401"

# ============================================
# RESULTADO
# ============================================
echo -e "\n${YELLOW}📊 RESULTADO${NC}"
echo -e "Testes aprovados: ${GREEN}$PASS${NC}"
echo -e "Testes falhados: ${RED}$FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "\n${GREEN}✅ FASE 2 - TESTES APROVADOS!${NC}\n"
  exit 0
else
  echo -e "\n${RED}❌ FASE 2 - ALGUNS TESTES FALHARAM${NC}\n"
  exit 1
fi
