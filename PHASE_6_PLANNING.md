# 🚀 PRÓXIMOS PASSOS - FASE 6+ 

## 🎯 Objetivo Fase 6

Integrar os serviços frontend com os componentes React, permitindo que o sistema funcione end-to-end.

---

## ✅ Verificação Rápida

Antes de começar Fase 6, certifique-se que Fase 5 está ok:

```bash
# Terminal 1: Backend
cd backend && npm start
# Esperado: ✅ Server running on port 3000

# Terminal 2: Frontend
cd frontend && npm run dev
# Esperado: ✅ Local: http://localhost:5173

# Terminal 3: Testes
cd frontend && node test-integration.js
# Esperado: ✅ Taxa de sucesso: 100%
```

Se tudo passou, está pronto para Fase 6! ✅

---

## 📋 Tarefas Fase 6 - Integração de Componentes

### 1️⃣ Atualizar Store/Context (30 min)

**Arquivo:** `frontend/App.tsx` ou novo arquivo de context

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { authService, AuthSession } from './services/authService';

interface AppContextType {
  session: AuthSession | null;
  isAuthenticated: boolean;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Restaurar sessão ao carregar página
    const storedSession = authService.getSession();
    if (storedSession) {
      setSession(storedSession);
    }
  }, []);

  return (
    <AppContext.Provider 
      value={{
        session,
        isAuthenticated: !!session,
        logout: () => {
          authService.logout();
          setSession(null);
        }
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAuth must be used within AppProvider');
  }
  return context;
}
```

### 2️⃣ Criar Dashboard (1-2 horas)

**Arquivo:** `frontend/components/Dashboard.tsx`

```typescript
import { useEffect, useState } from 'react';
import { ComandaService } from '../services/apiService';
import { useAuth } from '../App';

export function Dashboard() {
  const { session } = useAuth();
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadComandasAbertas = async () => {
      try {
        setLoading(true);
        const data = await ComandaService.listOpen();
        setComandas(data);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComandasAbertas();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Bem-vindo, {session?.user.name}!</p>
      
      <h2>Comandas Abertas ({comandas.length})</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Cliente</th>
              <th>Items</th>
              <th>Total</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {comandas.map(cmd => (
              <tr key={cmd.id}>
                <td>{cmd.mesa_numero}</td>
                <td>{cmd.customer_name}</td>
                <td>{cmd.items?.length || 0}</td>
                <td>R$ {cmd.total?.toFixed(2)}</td>
                <td>
                  <button onClick={() => window.location.href = `/comanda/${cmd.id}`}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### 3️⃣ Tela de Comandas (2-3 horas)

**Arquivo:** `frontend/components/ComandaDetail.tsx`

Funcionalidades:
- ✅ Adicionar itens
- ✅ Remover itens
- ✅ Atualizar quantidade
- ✅ Calcular total
- ✅ Fechar comanda

Usar `ComandaService` para:
- `addItem(comandaId, item)`
- `updateItem(comandaId, itemId, data)`
- `removeItem(comandaId, itemId)`
- `close(comandaId, payment)`

### 4️⃣ Tela de Estoque (2 horas)

**Arquivo:** `frontend/components/Inventory.tsx`

Funcionalidades:
- ✅ Listar produtos com quantidades
- ✅ Registrar entrada
- ✅ Registrar saída
- ✅ Ver histórico

Usar `StockMovementService` para:
- `list(filters)`
- `create(movement)`
- `getSummary()`

### 5️⃣ Tela de Receitas (2 horas)

**Arquivo:** `frontend/components/Recipes.tsx`

Funcionalidades:
- ✅ Listar receitas
- ✅ Editar ingredientes
- ✅ Ver capacidade de produção
- ✅ Validar disponibilidade

Usar `RecipeService` para:
- `list()`
- `getById(id)`
- `addIngredient(recipeId, ingredient)`
- `getProductionCapacity(recipeId)`

### 6️⃣ Tela de Fidelidade (1-2 horas)

**Arquivo:** `frontend/components/Loyalty.tsx`

Funcionalidades:
- ✅ Consultar saldo de pontos
- ✅ Adicionar pontos
- ✅ Resgatar pontos
- ✅ Ver histórico

Usar `LoyaltyService` para:
- `getBalance(customerId)`
- `addPoints(customerId, points, reason)`
- `redeemPoints(customerId, points)`

### 7️⃣ Tela de Usuários (1-2 horas)

**Arquivo:** `frontend/components/Users.tsx`

Funcionalidades:
- ✅ Listar usuários
- ✅ Criar usuário
- ✅ Editar usuário
- ✅ Deletar usuário

Usar `UserService` e `authService` para:
- `UserService.list()`
- `authService.register()`
- `UserService.update(id, data)`
- `UserService.delete(id)`

---

## 🗺️ Estrutura de Rotas Recomendada

```typescript
// App.tsx ou Router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAuth } from './App';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ComandaDetail from './components/ComandaDetail';
import Inventory from './components/Inventory';
import Recipes from './components/Recipes';
import Loyalty from './components/Loyalty';
import Users from './components/Users';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/comanda/:id" element={
            <ProtectedRoute>
              <ComandaDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/inventory" element={
            <ProtectedRoute>
              <Inventory />
            </ProtectedRoute>
          } />
          
          <Route path="/recipes" element={
            <ProtectedRoute>
              <Recipes />
            </ProtectedRoute>
          } />
          
          <Route path="/loyalty" element={
            <ProtectedRoute>
              <Loyalty />
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
```

---

## 🎨 Componentes Auxiliares Recomendados

### Loading Spinner
```typescript
export function LoadingSpinner() {
  return <div className="animate-spin">⏳</div>;
}
```

### Error Alert
```typescript
export function ErrorAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="alert alert-error">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}
```

### Success Toast
```typescript
export function SuccessToast({ message }: { message: string }) {
  return <div className="alert alert-success">{message}</div>;
}
```

### Confirm Modal
```typescript
export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <dialog open className="modal">
      <h3>{title}</h3>
      <p>{message}</p>
      <button onClick={onConfirm}>Confirmar</button>
      <button onClick={onCancel}>Cancelar</button>
    </dialog>
  );
}
```

---

## 📝 Padrões a Seguir

### 1. Sempre Usar Try-Catch
```typescript
try {
  const data = await ComandaService.getById(id);
  setComanda(data);
} catch (error) {
  setError(error.message);
}
```

### 2. Mostrar Loading State
```typescript
const [loading, setLoading] = useState(false);

const loadData = async () => {
  setLoading(true);
  try {
    // fetch data
  } catch (error) {
    // handle error
  } finally {
    setLoading(false);
  }
};
```

### 3. Validar Dados Antes de Enviar
```typescript
if (!comanda.customer_name?.trim()) {
  throw new Error('Nome do cliente é obrigatório');
}

const result = await ComandaService.create(comanda);
```

### 4. Usar localStorage para Cache
```typescript
// Salvar
localStorage.setItem('last_comanda', JSON.stringify(comanda));

// Recuperar
const cached = localStorage.getItem('last_comanda');
const comanda = cached ? JSON.parse(cached) : null;
```

---

## 🧪 Teste Cada Componente

Após criar cada componente:

1. **Teste Manual**
   - Acesse a página
   - Teste todos os botões
   - Verifique no DevTools (F12) se requisições estão corretas

2. **Teste Automático**
   ```bash
   # Adicionar teste unitário
   npm install --save-dev vitest
   ```

3. **Teste de Integração**
   - Verifique se dados aparecem corretamente
   - Teste fluxos completos

---

## 📈 Prioridade de Implementação

1. **Alto** (fazer primeiro)
   - [x] Dashboard com listagem de comandas
   - [x] Tela de comanda (criar, adicionar itens, fechar)
   - [x] Autenticação (já feito!)

2. **Médio** (fazer depois)
   - [ ] Tela de estoque
   - [ ] Tela de receitas
   - [ ] Tela de usuários

3. **Baixo** (fazer por último)
   - [ ] Tela de fidelidade
   - [ ] Relatórios
   - [ ] Configurações

---

## 🚨 Verificação Antes de Commitar

- [ ] Código sem console.log() de debug
- [ ] Sem erros no console (F12)
- [ ] Componentes carregam dados corretamente
- [ ] Erros são mostrados ao usuário
- [ ] Loading state funciona
- [ ] Logout limpa dados locais
- [ ] Tokens expirados fazem logout

---

## 📱 Responsividade

Use Tailwind para garantir responsividade:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards responsivos */}
</div>
```

---

## 🎓 Recursos de Aprendizado

- **React Docs:** https://react.dev
- **Tailwind:** https://tailwindcss.com
- **TypeScript:** https://www.typescriptlang.org/docs
- **Vite:** https://vitejs.dev

---

## ⏱️ Estimativa de Tempo

- **Fase 6a - Store/Router:** 1-2 horas
- **Fase 6b - Dashboard:** 1-2 horas
- **Fase 6c - Comandas:** 2-3 horas
- **Fase 6d - Estoque:** 1-2 horas
- **Fase 6e - Receitas:** 1-2 horas
- **Fase 6f - Fidelidade:** 1-2 horas
- **Fase 6g - Usuários:** 1-2 horas
- **Fase 6h - Testes:** 2-3 horas

**Total:** 10-18 horas para Fase 6 completa

---

## 🤝 Próximas Conversas

Quando tiver dúvidas sobre:
- **"Como criar componente X?"** → Mostro template com exemplos
- **"Qual serviço usar para Y?"** → Indico na documentação
- **"Erro: Z"** → Ajudo a debugar

Simplesmente mencione o arquivo/linha e o problema!

---

## 📞 Recapitulação Rápida

| Serviço | Para Fazer |
|---------|-----------|
| `ComandaService` | Gerenciar pedidos/mesas |
| `StockMovementService` | Controlar estoque |
| `RecipeService` | Gerenciar receitas/pratos |
| `LoyaltyService` | Gerenciar pontos |
| `UserService` | Gerenciar usuários |
| `authService` | Autenticação/logout |

---

**Você está pronto para Fase 6! 🚀**

Próximo passo: Implementar componentes um por um, começando pelo Dashboard.
