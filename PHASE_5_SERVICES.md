# Serviços Frontend - Fase 5

## 📋 Resumo da Implementação

Foram criados 3 serviços TypeScript na pasta `frontend/services/`:

### 1. **authService.ts** - Autenticação JWT
Gerencia login, sessões e tokens JWT

**Métodos principais:**
- `login(username, password)` - Autentica usuário
- `saveSession(loginResponse)` - Armazena sessão no localStorage
- `getToken()` - Retorna token armazenado
- `getSession()` - Retorna sessão completa com validação de expiração
- `isAuthenticated()` - Verifica se usuário está autenticado
- `getAuthHeader()` - Retorna header Authorization para requisições
- `logout()` - Limpa localStorage
- `getCurrentUser()` - Obtém dados do usuário autenticado via API

**Armazenamento:**
- `auth_token` - JWT token
- `auth_expiresAt` - Data de expiração (24 horas)
- `auth_session` - Objeto completo com usuário e token

---

### 2. **apiService.ts** - Cliente HTTP Centralizado
Gerencia todas as requisições HTTP com suporte automático a JWT

**Métodos base:**
- `get(endpoint, options)` - Requisição GET
- `post(endpoint, body, options)` - Requisição POST
- `put(endpoint, body, options)` - Requisição PUT
- `patch(endpoint, body, options)` - Requisição PATCH
- `delete(endpoint, options)` - Requisição DELETE

**Recursos:**
- ✅ Injeta automaticamente header `Authorization: Bearer {token}`
- ✅ Trata erros 401 com logout automático
- ✅ Desempacota resposta JSON
- ✅ Padroniza formato de resposta

**Classes de Serviço Específicas:**

#### **ComandaService**
```typescript
ComandaService.create(data)           // POST /api/comandas
ComandaService.list(filters?)         // GET /api/comandas
ComandaService.listOpen()             // GET /api/comandas/open
ComandaService.getById(id)            // GET /api/comandas/{id}
ComandaService.addItem(comandaId, itemData)
ComandaService.updateItem(comandaId, itemId, data)
ComandaService.removeItem(comandaId, itemId)
ComandaService.close(comandaId, paymentData)
ComandaService.cancel(comandaId)
ComandaService.update(id, data)
ComandaService.delete(id)
```

#### **StockMovementService**
```typescript
StockMovementService.create(data)
StockMovementService.list(filters?)
StockMovementService.getById(id)
StockMovementService.getSummary()
StockMovementService.update(id, data)
StockMovementService.delete(id)
```

#### **RecipeService**
```typescript
RecipeService.create(data)
RecipeService.list(filters?)
RecipeService.getById(id)
RecipeService.getByProductId(productId)
RecipeService.addIngredient(recipeId, ingredientData)
RecipeService.updateIngredient(recipeId, ingredientId, data)
RecipeService.removeIngredient(recipeId, ingredientId)
RecipeService.getProductionCapacity(recipeId)
RecipeService.validateStock(recipeId, quantity)
RecipeService.update(id, data)
RecipeService.delete(id)
```

#### **LoyaltyService**
```typescript
LoyaltyService.create(data)
LoyaltyService.list(filters?)
LoyaltyService.getById(id)
LoyaltyService.listByCustomer(customerId)
LoyaltyService.getBalance(customerId)
LoyaltyService.addPoints(customerId, points, reason)
LoyaltyService.redeemPoints(customerId, points)
LoyaltyService.adjustPoints(id, data)
```

#### **UserService**
```typescript
UserService.getMe()
UserService.list()
UserService.update(id, data)
UserService.delete(id)
```

---

## 🔄 Componente Login Atualizado

**Alterações em `frontend/components/Login.tsx`:**
- ✅ Importa `authService`
- ✅ Remove apiUrl local (agora em authService)
- ✅ Usa `authService.login()` em vez de fetch direto
- ✅ Usa `authService.saveSession()` para armazenar credenciais
- ✅ Endpoint corrigido de `/api/auth/login` → `/api/users/login`
- ✅ Mantém fallback para modo demo

---

## 🚀 Como Usar os Serviços

### Exemplo 1: Listar Comandas Abertas
```typescript
import { ComandaService } from '../services/apiService';

const loadComandasAbertas = async () => {
  try {
    const comandas = await ComandaService.listOpen();
    console.log(comandas);
  } catch (error) {
    console.error('Erro:', error.message);
  }
};
```

### Exemplo 2: Criar Nova Comanda
```typescript
const criarComanda = async () => {
  const comanda = await ComandaService.create({
    mesa_numero: 5,
    customer_name: 'João Silva'
  });
  console.log('Comanda criada:', comanda.id);
};
```

### Exemplo 3: Adicionar Item à Comanda
```typescript
const adicionarItem = async (comandaId: string) => {
  const item = await ComandaService.addItem(comandaId, {
    produto_id: 'abc123',
    quantidade: 2,
    observacoes: 'Sem cebola'
  });
};
```

### Exemplo 4: Fechar Comanda
```typescript
const fecharComanda = async (comandaId: string) => {
  const resultado = await ComandaService.close(comandaId, {
    metodo_pagamento: 'cartao',
    valor_recebido: 50.00,
    desconto: 0
  });
};
```

### Exemplo 5: Movimentação de Estoque
```typescript
const registrarEntrada = async () => {
  const movimento = await StockMovementService.create({
    produto_id: 'xyz789',
    tipo: 'entrada',
    quantidade: 10,
    custo_unitario: 5.00,
    observacoes: 'Compra do fornecedor'
  });
};
```

### Exemplo 6: Verificar Pontos do Cliente
```typescript
const consultarPontos = async (customerId: string) => {
  const balance = await LoyaltyService.getBalance(customerId);
  console.log(`Saldo de pontos: ${balance.total_points}`);
};
```

---

## ⚙️ Tratamento de Erros

Todos os serviços compartilham tratamento centralizado:

```typescript
try {
  const data = await ComandaService.getById('123');
} catch (error) {
  // Erros 401 fazem logout automático e redirecionam para /login
  // Outros erros retornam a mensagem de erro da API
  console.error(error.message);
}
```

---

## 🔐 Fluxo de Autenticação

1. **Login.tsx** chama `authService.login()`
2. **authService** envia POST para `/api/users/login`
3. Backend retorna `{ user, token }`
4. **authService.saveSession()** armazena em localStorage
5. **Próximas requisições** incluem header `Authorization: Bearer {token}`
6. **apiService** verifica respostas 401 e faz logout automático

---

## 📝 Próximos Passos

1. ✅ Criar authService.ts
2. ✅ Criar apiService.ts com serviços específicos
3. ✅ Atualizar Login.tsx
4. ⏳ Atualizar componentes para usar os serviços
5. ⏳ Configurar .env com VITE_API_URL
6. ⏳ Testar fluxo completo de autenticação
7. ⏳ Implementar refresh token (opcional)

---

## 📦 Variáveis de Ambiente Necessárias

```
# .env.local
VITE_API_URL=http://localhost:3000
VITE_DEMO_MODE=false
```

Ou manter padrões:
- `VITE_API_URL` → padrão: `http://localhost:3000`
- `VITE_DEMO_MODE` → padrão: `false`
