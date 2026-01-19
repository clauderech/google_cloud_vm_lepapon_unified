# Middleware de Autenticação JWT - Guia de Uso

## 📋 Resumo

O arquivo `backend/middleware/authMiddleware.js` fornece 3 middlewares:
- **authMiddleware**: Exige token válido (rota protegida)
- **roleMiddleware**: Verifica se usuário tem role específica
- **optionalAuthMiddleware**: Token é opcional (anônimo permitido)

---

## 🔧 Como Usar

### 1. Importar o middleware
```javascript
// Em qualquer arquivo de rota
const { authMiddleware, roleMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');
```

### 2. Proteger uma rota (exigir token)
```javascript
// GET /api/dashboard - apenas usuários autenticados
router.get('/dashboard', authMiddleware, (req, res) => {
  // req.user contém: { id, username, name, role, iat, exp }
  res.json({
    message: 'Bem-vindo ao dashboard',
    user: req.user
  });
});
```

### 3. Proteger por role específica
```javascript
// POST /api/users - apenas admins
router.post('/users', 
  authMiddleware,
  roleMiddleware('admin'),
  (req, res) => {
    // Apenas admin pode chegar aqui
    res.json({ message: 'Usuário criado' });
  }
);

// Com múltiplas roles permitidas
router.delete('/orders/:id',
  authMiddleware,
  roleMiddleware(['admin', 'operador']),
  (req, res) => {
    // Admin ou operador podem deletar
    res.json({ message: 'Pedido deletado' });
  }
);
```

### 4. Token opcional
```javascript
// GET /api/products - pode acessar anonimamente, mas se autenticado retorna desconto
router.get('/products', optionalAuthMiddleware, (req, res) => {
  const products = [...];
  
  if (req.user) {
    // Usuário autenticado: aplicar desconto
    products.forEach(p => p.price *= 0.9);
  }
  
  res.json(products);
});
```

---

## 📚 Exemplos Práticos

### Exemplo Completo: CRUD de Pedidos Protegido

```javascript
// backend/routes/orders.js

const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// GET /api/orders - listar pedidos (autenticado)
router.get('/', authMiddleware, (req, res) => {
  // Listar apenas pedidos do usuário ou de toda empresa (se admin)
  const orders = req.user.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(req.user.id);
  
  res.json(orders);
});

// POST /api/orders - criar novo pedido (autenticado)
router.post('/', authMiddleware, (req, res) => {
  const newOrder = {
    ...req.body,
    createdBy: req.user.id,
    createdAt: new Date()
  };
  
  saveOrder(newOrder);
  res.status(201).json(newOrder);
});

// DELETE /api/orders/:id - deletar pedido (apenas admin/operador)
router.delete('/:id', 
  authMiddleware,
  roleMiddleware(['admin', 'operador']),
  (req, res) => {
    deleteOrder(req.params.id);
    res.json({ success: true });
  }
);

module.exports = router;
```

### Configurar em app.js
```javascript
// backend/app.js

const ordersRoutes = require('./routes/orders');

// ... outros middlewares ...

app.use('/api/orders', ordersRoutes);  // ✅ Todas as rotas acima ficarão protegidas
```

---

## 🔒 Fluxo de Validação

```
Request com Authorization header
↓
authMiddleware recebe
↓
1. Verifica se Authorization existe
   ↓ Não existe? → 401 (Token não fornecido)
↓
2. Valida formato "Bearer {token}"
   ↓ Inválido? → 401 (Formato inválido)
↓
3. Valida assinatura do token
   ↓ Expirado? → 401 (Token expirado)
   ↓ Inválido? → 401 (Token inválido)
↓
4. Token válido! ✅
   → Decodifica e adiciona req.user = { id, username, role, ... }
   → Chama next() → próximo middleware/rota
```

---

## ⚠️ Tratamento de Erros

O middleware retorna JSON com informações detalhadas:

```javascript
// Token não fornecido
{
  "error": "Token não fornecido",
  "message": "Header Authorization é obrigatório"
}

// Token expirado
{
  "error": "Token expirado",
  "expiredAt": "2025-01-20T10:00:00.000Z"
}

// Token inválido
{
  "error": "Token inválido",
  "message": "invalid token"
}

// Acesso negado (role insuficiente)
{
  "error": "Acesso negado",
  "message": "Este recurso requer uma dos seguintes roles: admin"
}
```

---

## 📊 Dados Disponíveis em req.user

Depois de passar por `authMiddleware`, você tem acesso a:

```javascript
req.user = {
  id: "admin_1",           // ID do usuário
  username: "admin",       // Nome de usuário
  name: "Administrador",   // Nome completo
  role: "admin",           // Role/Permissão
  iat: 1705000000,         // Issued at (timestamp)
  exp: 1705604800          // Expiration (timestamp)
}
```

Use esses dados para:
- Logar quem fez a ação: `console.log('Ação feita por:', req.user.username)`
- Filtrar dados por usuário: `getOrdersByUser(req.user.id)`
- Auditar operações: `logAction(req.user.id, 'DELETE_ORDER', orderId)`

---

## 🚀 Aplicar a Todas as Rotas de API

Para proteger automaticamente todas as rotas, adicione antes das rotas em `app.js`:

```javascript
// backend/app.js

const { authMiddleware } = require('./middleware/authMiddleware');

// ... após middlewares básicos ...

// IMPORTANTE: Aplicar authMiddleware globalmente (exceto auth)
app.use('/api', (req, res, next) => {
  // Rotas públicas que não precisam de autenticação
  if (req.path.startsWith('/auth')) {
    return next();  // /api/auth/login não requer token
  }
  
  // Todas as outras rotas requerem autenticação
  authMiddleware(req, res, next);
});

// Agora todas as rotas /api/* estão protegidas automaticamente
```

---

## 🔄 Renovar Token (Token Refresh)

Para permitir renovação de token sem fazer login novamente:

```javascript
// backend/routes/auth.js - adicionar endpoint

router.post('/refresh', (req, res) => {
  const token = req.headers.authorization?.substring(7);
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Gerar novo token com mesmos dados
    const newToken = jwt.sign(
      { id: decoded.id, username: decoded.username, name: decoded.name, role: decoded.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token: newToken, expiresIn: '7d' });
  });
});
```

Frontend pode chamar `/api/auth/refresh` antes do token expirar para renovar.

---

## ✅ Checklist de Implementação

- [ ] authMiddleware.js criado em `/backend/middleware/`
- [ ] Middleware importado em rotas que precisam proteção
- [ ] Testar com requisição SEM token → deve retornar 401
- [ ] Testar com token INVÁLIDO → deve retornar 401
- [ ] Testar com token VÁLIDO → deve funcionar
- [ ] JWT_SECRET definido em `.env` (variável de ambiente)
- [ ] CORS configurado para permitir header Authorization
- [ ] Rota /api/auth/* pública (não protegida)
- [ ] Outras rotas /api/* protegidas por authMiddleware

---

**Próximo passo:** Aplicar este middleware em todas as rotas existentes no backend que precisem de autenticação.
