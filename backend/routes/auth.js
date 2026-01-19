/**
 * Rotas de Autenticação (API)
 * POST /api/auth/login - Realizar login com credenciais
 * POST /api/auth/validate - Validar token JWT
 * POST /api/auth/logout - Fazer logout
 */

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Chave secreta JWT (DEVE estar em variável de ambiente em produção)
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui-mude-em-producao';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // 7 dias

/**
 * Usuários cadastrados no sistema
 * Em produção, buscar do banco de dados
 */
const USERS_DATABASE = [
  {
    id: 'user_admin_1',
    username: 'admin',
    password: 'admin123', // Em produção: usar hash (bcrypt)
    name: 'Administrador',
    role: 'admin',
    email: 'admin@lanchonete.local',
    active: true
  },
  {
    id: 'user_operador_1',
    username: 'operador',
    password: 'op123', // Em produção: usar hash (bcrypt)
    name: 'Operador',
    role: 'operador',
    email: 'operador@lanchonete.local',
    active: true
  },
  {
    id: 'user_caixa_1',
    username: 'caixa',
    password: 'caixa123', // Em produção: usar hash (bcrypt)
    name: 'Caixa',
    role: 'caixa',
    email: 'caixa@lanchonete.local',
    active: true
  }
];

/**
 * POST /api/auth/login
 * Login com credenciais
 * 
 * Body:
 *   - username: string
 *   - password: string
 * 
 * Response:
 *   - token: string (JWT)
 *   - user: object
 *   - expiresIn: string
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // Validar entrada
    if (!username || !password) {
      return res.status(400).json({
        error: 'Invalid credentials',
        message: 'Usuário e senha são obrigatórios'
      });
    }

    // Buscar usuário
    const user = USERS_DATABASE.find(u => u.username === username);

    // Validar usuário existe
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Usuário ou senha incorretos'
      });
    }

    // Validar usuário ativo
    if (!user.active) {
      return res.status(403).json({
        error: 'User disabled',
        message: 'Usuário está desativado'
      });
    }

    // Validar senha (em produção: usar bcrypt)
    if (user.password !== password) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Usuário ou senha incorretos'
      });
    }

    // Gerar JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    // Retornar sucesso
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email
      },
      expiresIn: JWT_EXPIRY
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao fazer login'
    });
  }
});

/**
 * POST /api/auth/validate
 * Validar token JWT
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - valid: boolean
 *   - user: object
 */
router.post('/validate', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        message: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // Verificar token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          valid: false,
          message: 'Token inválido ou expirado',
          error: err.message
        });
      }

      return res.status(200).json({
        valid: true,
        user: decoded
      });
    });
  } catch (error) {
    console.error('[Validate Error]', error);
    return res.status(500).json({
      valid: false,
      message: 'Erro ao validar token'
    });
  }
});

/**
 * POST /api/auth/logout
 * Fazer logout (apenas limpar sessão frontend)
 * 
 * Response:
 *   - success: boolean
 */
router.post('/logout', (req, res) => {
  // Logout é feito no frontend removendo o token
  // Backend só valida se necessário
  return res.status(200).json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

/**
 * GET /api/auth/me
 * Obter dados do usuário autenticado
 * 
 * Headers:
 *   - Authorization: Bearer <token>
 * 
 * Response:
 *   - user: object
 */
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Token inválido ou expirado'
        });
      }

      return res.status(200).json({
        user: decoded
      });
    });
  } catch (error) {
    console.error('[Me Error]', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
