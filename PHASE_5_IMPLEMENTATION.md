# Guia Completo - Fase 5: Integração Frontend-Backend

## 🎯 Objetivo

Conectar o frontend React ao backend Express com autenticação JWT real e consumir os novos endpoints das tabelas implementadas.

---

## ✅ O que foi criado

### Serviços Frontend (`frontend/services/`)

1. **authService.ts**
   - Gerencia login com JWT
   - Armazena sessão em localStorage
   - Valida expiração de token (24h)
   - Fornece header Authorization automático

2. **apiService.ts**
   - Cliente HTTP centralizado
   - 5 classes de serviço específicas:
     - ComandaService (Pedidos/Ordens)
     - StockMovementService (Inventário)
     - RecipeService (Receitas/Pratos)
     - LoyaltyService (Pontos de Fidelidade)
     - UserService (Gerenciamento de Usuários)
   - Trata erros 401 com logout automático

3. **Login.tsx atualizado**
   - Usa authService em vez de fetch direto
   - Endpoint corrigido `/api/users/login`
   - Mantém suporte a modo demo

---

## 🚀 Como Usar

### 1. Iniciar Backend

```bash
cd backend
npm start
# Backend rodando em http://localhost:3000
```

Backend deve mostrar:
```
✅ Database connected
✅ Server running on port 3000
```

### 2. Iniciar Frontend (em outro terminal)

```bash
cd frontend
npm run dev
# Frontend rodando em http://localhost:5173
```

### 3. Fazer Login

Na tela de login, use as credenciais do seeder:
- **Usuário:** `admin`
- **Senha:** `admin123`

Ou crie novos usuários:
- **Usuário:** `operador`
- **Senha:** `operador123`
- **Usuário:** `caixa`
- **Senha:** `caixa123`

### 4. Testar Integração

```bash
cd frontend
node test-integration.js
```

Output esperado:
```
✅ Login: 200
✅ GET /api/users/me: 200
✅ GET /api/comandas: 200
📈 Taxa de sucesso: 100%
```

---

## 📋 Checklist de Implementação

### Backend ✅
- [x] 8 Migrações de banco de dados
- [x] 7 Modelos Knex com CRUD
- [x] 5 Controllers com 43 endpoints
- [x] 5 Route files registrados em app.js
- [x] Autenticação JWT com User model
- [x] Seeder de usuários

### Frontend ✅
- [x] authService.ts (Login/Sessão)
- [x] apiService.ts (Cliente HTTP)
- [x] ComandaService
- [x] StockMovementService
- [x] RecipeService
- [x] LoyaltyService
- [x] UserService
- [x] Login.tsx atualizado
- [x] Test script

### Próximas Etapas ⏳
- [ ] Atualizar componentes para usar serviços
- [ ] Implementar listagem de comandas
- [ ] Implementar tela de criação de comanda
- [ ] Implementar tela de estoque
- [ ] Implementar tela de receitas
- [ ] Implementar tela de fidelidade
- [ ] Configurar refresh token (opcional)
- [ ] Testes E2E

---

## 🔍 Exemplos de Uso

### Listar Comandas Abertas

```typescript
// Em um componente React
import { ComandaService } from '../services/apiService';
import { useEffect, useState } from 'react';

export function MinhaTela() {
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadComandasAbertas = async () => {
      try {
        setLoading(true);
        const data = await ComandaService.listOpen();
        setComandas(data);
      } catch (error) {
        console.error('Erro:', error.message);
      } finally {
        setLoading(false);
      }
    };
    loadComandasAbertas();
  }, []);

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h2>Comandas Abertas ({comandas.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {comandas.map(cmd => (
            <tr key={cmd.id}>
              <td>{cmd.mesa_numero}</td>
              <td>{cmd.customer_name}</td>
              <td>{cmd.status}</td>
              <td>R$ {cmd.total?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Criar Nova Comanda

```typescript
import { ComandaService } from '../services/apiService';

async function criarComanda(mesaNumero: number, clientName: string) {
  try {
    const newComanda = await ComandaService.create({
      mesa_numero: mesaNumero,
      customer_name: clientName,
      status: 'pending'
    });
    console.log('Comanda criada:', newComanda.id);
    return newComanda;
  } catch (error) {
    console.error('Erro ao criar comanda:', error.message);
  }
}
```

### Registrar Movimentação de Estoque

```typescript
import { StockMovementService } from '../services/apiService';

async function registrarEntrada(produtoId: string, quantidade: number, custo: number) {
  try {
    const movimento = await StockMovementService.create({
      produto_id: produtoId,
      tipo: 'entrada',
      quantidade: quantidade,
      custo_unitario: custo,
      observacoes: 'Compra do fornecedor'
    });
    console.log('Movimento registrado:', movimento.id);
  } catch (error) {
    console.error('Erro:', error.message);
  }
}
```

### Consultar Pontos do Cliente

```typescript
import { LoyaltyService } from '../services/apiService';

async function consultarPontos(customerId: string) {
  try {
    const balance = await LoyaltyService.getBalance(customerId);
    console.log(`Cliente tem ${balance.total_points} pontos`);
    return balance.total_points;
  } catch (error) {
    console.error('Erro:', error.message);
  }
}
```

---

## 🔐 Segurança

### Token Handling

1. **Login:** `authService.login()` → recebe token
2. **Armazenamento:** localStorage com expiração 24h
3. **Requisições:** apiService injeta `Authorization: Bearer {token}`
4. **Logout:** `authService.logout()` limpa localStorage
5. **Expiração:** Sessão expirada = logout automático

### Proteção de Rotas

```typescript
// Exemplo: Rota protegida
import { authService } from '../services/authService';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  return children;
}
```

---

## 🧪 Teste Manual

### 1. Teste de Login

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Login bem-sucedido",
  "data": {
    "user": {
      "id": "...",
      "username": "admin",
      "name": "Administrador",
      "role": "admin",
      "is_active": true
    },
    "token": "eyJhbGc..."
  }
}
```

### 2. Teste de Endpoint Protegido

```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer {TOKEN_AQUI}"
```

### 3. Teste de Listagem de Comandas

```bash
curl -X GET http://localhost:3000/api/comandas \
  -H "Authorization: Bearer {TOKEN_AQUI}"
```

---

## 🐛 Troubleshooting

### "Erro ao conectar ao servidor"

1. Verifique se backend está rodando:
   ```bash
   curl http://localhost:3000/health
   ```

2. Verifique VITE_API_URL em `frontend/.env.local`:
   ```
   VITE_API_URL=http://localhost:3000
   ```

3. Reinicie backend:
   ```bash
   cd backend && npm start
   ```

### "Token inválido" ou "Não autorizado"

1. Verifique se JWT_SECRET está em `.env`:
   ```bash
   cat backend/.env | grep JWT_SECRET
   ```

2. Teste login manual:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'
   ```

### Frontend não vê dados

1. Abra DevTools (F12)
2. Vá para aba "Network"
3. Faça login e observe as requisições
4. Verifique se responses têm status 200
5. Verifique se header Authorization está sendo enviado

---

## 📈 Próximas Implementações

### Componentes para Atualizar

1. **Dashboard**
   - Usar ComandaService.listOpen()
   - Mostrar comandas em tempo real

2. **Tela de Pedidos**
   - Usar ComandaService.create()
   - Usar ComandaService.addItem()
   - Usar ComandaService.close()

3. **Estoque**
   - Usar StockMovementService.list()
   - Usar StockMovementService.create()
   - Usar StockMovementService.getSummary()

4. **Receitas**
   - Usar RecipeService.list()
   - Usar RecipeService.getProductionCapacity()
   - Usar RecipeService.validateStock()

5. **Fidelidade**
   - Usar LoyaltyService.getBalance()
   - Usar LoyaltyService.addPoints()
   - Usar LoyaltyService.redeemPoints()

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs do backend: `npm start` mostra erros
2. Verifique console do frontend: F12 > Console
3. Revise os arquivos de serviço em `frontend/services/`
4. Consulte a documentação de cada service

---

**Fase 5 Status:** ✅ Serviços criados | ⏳ Componentes por atualizar
