'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Valida o token JWT fornecido no header Authorization
 * Se válido, adiciona dados do usuário ao req.user
 * Se inválido, retorna 401 Unauthorized
 */

const authMiddleware = (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Token não fornecido',
        message: 'Header Authorization é obrigatório'
      });
    }

    // Validar formato: "Bearer {token}"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        error: 'Formato de token inválido',
        message: 'Use: Authorization: Bearer {token}'
      });
    }

    const token = parts[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

    // Verificar e decodificar token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expirado',
            expiredAt: err.expiredAt
          });
        }

        if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Token inválido',
            message: err.message
          });
        }

        return res.status(401).json({
          error: 'Erro ao validar token',
          message: err.message
        });
      }

      // Token válido: adicionar dados do usuário ao request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('[Auth Middleware] Erro:', error.message);
    return res.status(500).json({
      error: 'Erro interno ao validar token'
    });
  }
};

/**
 * Middleware para verificar permissão baseada em role
 * @param {string|string[]} allowedRoles - Roles que têm acesso
 */

const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    if (!rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acesso negado',
        message: `Este recurso requer uma dos seguintes roles: ${rolesArray.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware opcional: se houver token, valida e carrega dados do usuário
 * Se não houver token, continua sem erro (para rotas que permitem acessso anônimo)
 */

const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    // Sem token, continuar sem erro
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    // Token mal formatado, continuar sem erro
    return next();
  }

  const token = parts[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err) {
      // Token válido, adicionar dados do usuário
      req.user = decoded;
    }
    // Erro ou token inválido, continuar sem adicionar req.user
    next();
  });
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  optionalAuthMiddleware
};
