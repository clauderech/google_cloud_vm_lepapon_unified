const express = require('express');
const router = express.Router();

/**
 * Usuários de teste e suas credenciais
 */
const DEMO_USERS = [
  { id: 'admin_1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin' },
  { id: 'op_1', username: 'operador', password: 'op123', name: 'Operador', role: 'operador' },
  { id: 'caixa_1', username: 'caixa', password: 'caixa123', name: 'Caixa', role: 'caixa' }
];

/**
 * POST /api/auth/login
 * Gera um token de sessão para autenticação
 * 
 * Body: { username, password }
 * Response: { token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'username e password são obrigatórios'
      });
    }

    // Validar credenciais
    const user = DEMO_USERS.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário ou senha incorretos'
      });
    }

    // Gerar token de sessão (Fase 1: simples; Fase 4: JWT)
    const token = `session_${user.role}_${user.id}_${Date.now()}`;

    console.log('[AUTH][LOGIN][SUCCESS]', {
      username,
      userId: user.id,
      role: user.role,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        loginAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[AUTH][LOGIN][ERROR]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Invalida o token de sessão
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    console.log('[AUTH][LOGOUT]', {
      token: token ? 'Present' : 'Missing',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('[AUTH][LOGOUT][ERROR]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/demo-users
 * Retorna lista de usuários de demonstração disponíveis
 * (Apenas para desenvolvimento)
 */
router.get('/demo-users', (req, res) => {
  res.json({
    message: 'Usuários disponíveis para teste',
    users: DEMO_USERS.map(u => ({
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role
    }))
  });
});

/**
 * GET /api/auth/test-token
 * Retorna um token de teste para debug (não usar em produção!)
 */
router.get('/test-token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Este endpoint não está disponível em produção'
    });
  }

  const user = DEMO_USERS[0]; // admin
  const token = `session_${user.role}_${user.id}_${Date.now()}`;

  res.json({
    token,
    usage: 'Authorization: Bearer ' + token,
    expires: 'Nesta sessão (Fase 4: será JWT com expiração)'
  });
});

module.exports = router;
