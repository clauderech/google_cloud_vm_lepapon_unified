'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação flexível
 * Suporta tanto JWT real quanto modo demo (para desenvolvimento)
 * Prioridade: JWT > Modo Demo > Falhar
 */

const authMiddlewareFlexible = (req, res, next) => {
  try {
    const demoMode = process.env.VITE_DEMO_MODE === 'true';
    const authHeader = req.headers.authorization;

    // Tentar JWT primeiro
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key-change-in-production';

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        return next();
      } catch (error) {
        // Se JWT falhar, tentar modo demo
        if (!demoMode) {
          return res.status(401).json({
            error: 'Token inválido',
            message: error.message,
          });
        }
        // Caso contrário, continuar para tentar modo demo abaixo
      }
    }

    // Modo demo (para desenvolvimento)
    if (demoMode) {
      // Se não houver token, criar usuário demo padrão
      req.user = {
        id: 'demo-user',
        username: 'demo',
        name: 'Usuário Demo',
        role: 'admin', // Admin completo no modo demo
      };
      return next();
    }

    // Se nenhum método funcionar, retornar erro
    return res.status(401).json({
      error: 'Autenticação necessária',
      message: 'Forneca um token JWT válido',
    });
  } catch (error) {
    console.error('[Auth Middleware Flexible] Erro:', error.message);
    return res.status(500).json({
      error: 'Erro interno ao autenticar',
      message: error.message,
    });
  }
};

module.exports = authMiddlewareFlexible;
