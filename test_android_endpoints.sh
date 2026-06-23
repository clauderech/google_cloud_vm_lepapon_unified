#!/bin/bash

# Script para testar endpoints Android
# Uso: ./test_android_endpoints.sh

set -e

# Configuração
BASE_URL="http://localhost:3000"
API_KEY="sua_chave_api_aqui"  # Substitua pela X-API-Key do seu .env
AUTH_TOKEN="seu_token_aqui"   # Será preenchido após login

echo "======================================"
echo "TESTE DOS ENDPOINTS ANDROID"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Teste 1: GET /api/products/android SEM chave (deve falhar 401)
echo "1️⃣  Testando GET /api/products/android SEM X-API-Key (esperado: 401)"
echo "---"
curl -s -X GET "$BASE_URL/api/products/android" \
  -H "Content-Type: application/json" | jq .
echo ""
echo ""

# Teste 2: GET /api/products/android COM chave válida (deve retornar lista)
echo "2️⃣  Testando GET /api/products/android COM X-API-Key válida (esperado: 200)"
echo "---"
curl -s -X GET "$BASE_URL/api/products/android" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" | jq .
echo ""
echo ""

# Teste 3: POST /api/purchases/android SEM chave (deve falhar 401)
echo "3️⃣  Testando POST /api/purchases/android SEM X-API-Key (esperado: 401)"
echo "---"
curl -s -X POST "$BASE_URL/api/purchases/android" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierId": "supplier_1",
    "items": [
      {
        "productId": "prod_1",
        "productName": "Cerveja 600ml",
        "quantity": 10,
        "unitPrice": 8.50
      }
    ],
    "total": 85.00,
    "invoiceNumber": "NF-001"
  }' | jq .
echo ""
echo ""

# Teste 4: POST /api/purchases/android COM chave - payload inválido (deve falhar 400)
echo "4️⃣  Testando POST /api/purchases/android COM chave válida MAS payload inválido (esperado: 400)"
echo "---"
curl -s -X POST "$BASE_URL/api/purchases/android" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "items": []
  }' | jq .
echo ""
echo ""

# Teste 5: POST /api/purchases/android COM chave e payload válido (deve retornar 201)
echo "5️⃣  Testando POST /api/purchases/android COM chave válida E payload válido (esperado: 201)"
echo "---"
curl -s -X POST "$BASE_URL/api/purchases/android" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "supplierId": "supplier_1",
    "items": [
      {
        "productId": "prod_insumo_1",
        "productName": "Farinha de Trigo 5kg",
        "quantity": 5,
        "unitPrice": 15.00
      },
      {
        "productId": "prod_insumo_2",
        "productName": "Óleo de Soja 5L",
        "quantity": 2,
        "unitPrice": 8.50
      }
    ],
    "total": 92.00,
    "invoiceNumber": "NF-TEST-001"
  }' | jq .
echo ""
echo ""

# Teste 6: GET /api/products/android COM chave válida (validar tipos)
echo "6️⃣  Validar tipos de produtos retornados em GET /api/products/android"
echo "---"
echo "Esperado: apenas tipos em [insumo, insumo_bebida, revenda]"
curl -s -X GET "$BASE_URL/api/products/android" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" | jq '.data[] | {id, name, type, price, stock}'
echo ""
echo ""

echo "======================================"
echo "TESTES CONCLUÍDOS"
echo "======================================"
echo ""
echo "Instruções:"
echo "1. Substitua 'sua_chave_api_aqui' pela X-API-Key do seu .env"
echo "2. Certifique-se que o backend está rodando em http://localhost:3000"
echo "3. Execute: chmod +x test_android_endpoints.sh && ./test_android_endpoints.sh"
echo ""
