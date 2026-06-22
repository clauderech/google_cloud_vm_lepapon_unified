/**
 * Middleware de Autenticação com Controle de Roles
 * Valida se o usuário tem permissão baseado em seu role
 * 
 * Suporta: admin, operador, caixa
 */

/**
 * Validar se usuário é ADMIN
 */
function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Apenas administradores podem acessar este recurso',
        userRole: req.user.role
      });
    }

    console.log(`[RoleAuth] ✅ Admin access granted to ${req.user.id}`);
    next();
  } catch (error) {
    console.error('[RoleAuth] Erro ao validar admin:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Validar se usuário é OPERADOR ou ADMIN
 */
function requireOperador(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    const allowedRoles = ['admin', 'operador'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Apenas operadores e administradores podem acessar este recurso',
        userRole: req.user.role,
        allowedRoles
      });
    }

    console.log(`[RoleAuth] ✅ Operador access granted to ${req.user.id} (${req.user.role})`);
    next();
  } catch (error) {
    console.error('[RoleAuth] Erro ao validar operador:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Validar se usuário é CAIXA, OPERADOR ou ADMIN
 */
function requireCaixa(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    const allowedRoles = ['admin', 'operador', 'caixa'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Acesso negado para este recurso',
        userRole: req.user.role,
        allowedRoles
      });
    }

    console.log(`[RoleAuth] ✅ Caixa access granted to ${req.user.id} (${req.user.role})`);
    next();
  } catch (error) {
    console.error('[RoleAuth] Erro ao validar caixa:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Validar se usuário tem um dos roles especificados
 * @param {string[]} allowedRoles - Array de roles permitidas
 * @returns {Function} Middleware function
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Usuário não autenticado'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Seu role não tem permissão para este recurso',
          userRole: req.user.role,
          allowedRoles
        });
      }

      console.log(`[RoleAuth] ✅ Role check passed for ${req.user.id} (${req.user.role})`);
      next();
    } catch (error) {
      console.error('[RoleAuth] Erro ao validar role:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware para extrair role e ID do usuário (para debug)
 */
function extractUserInfo(req, res, next) {
  if (req.user) {
    console.log(`[UserInfo] ID: ${req.user.id}, Role: ${req.user.role}`);
  }
  next();
}

module.exports = {
  requireAdmin,
  requireOperador,
  requireCaixa,
  requireRole,
  extractUserInfo
};
