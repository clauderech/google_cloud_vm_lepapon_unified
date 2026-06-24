const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

/**
 * Usuários de teste e suas credenciais
 */
const DEMO_USERS = [
  { id: 'admin_1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin' },
  { id: 'op_1', username: 'operador', password: 'op123', name: 'Operador', role: 'operador' },
  { id: 'caixa_1', username: 'caixa', password: 'caixa123', name: 'Caixa', role: 'caixa' }
];

function isTruthyFlag(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['1', 'true', 'yes', 'active', 'enabled'].includes(normalized);
  }
  return false;
}

async function verifyPassword(inputPassword, dbUser) {
  const hashCandidate = dbUser.password_hash || dbUser.passwordHash;
  const plainCandidate = dbUser.password;

  if (typeof hashCandidate === 'string' && hashCandidate.length > 0) {
    if (hashCandidate.startsWith('$2a$') || hashCandidate.startsWith('$2b$') || hashCandidate.startsWith('$2y$')) {
      return bcrypt.compare(inputPassword, hashCandidate);
    }

    // Compatibilidade: alguns ambientes antigos salvaram senha em texto na coluna password_hash.
    return inputPassword === hashCandidate;
  }

  if (typeof plainCandidate === 'string' && plainCandidate.length > 0) {
    if (plainCandidate.startsWith('$2a$') || plainCandidate.startsWith('$2b$') || plainCandidate.startsWith('$2y$')) {
      return bcrypt.compare(inputPassword, plainCandidate);
    }

    return inputPassword === plainCandidate;
  }

  return false;
}

function mapUserFromDb(dbUser) {
  return {
    id: String(dbUser.id),
    name: dbUser.name || dbUser.full_name || dbUser.username,
    role: dbUser.role || 'operador',
    loginAt: new Date().toISOString()
  };
}

function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'A nova senha deve ter pelo menos 8 caracteres';
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'A nova senha deve conter letras e números';
  }

  return null;
}

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

    const db = req.db;
    if (!db) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conexão com banco indisponível'
      });
    }

    const usersTable = process.env.AUTH_USERS_TABLE || 'users';
    const hasUsersTable = await db.schema.hasTable(usersTable);

    if (!hasUsersTable) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: `Tabela de autenticação '${usersTable}' não encontrada no banco`,
        hint: 'Configure AUTH_USERS_TABLE ou crie a tabela users com username/senha'
      });
    }

    // Validar credenciais no banco
    const dbUser = await db(usersTable)
      .where({ username })
      .first();

    if (!dbUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário ou senha incorretos'
      });
    }

    // Bloqueio para usuários inativos em schemas diferentes.
    if (
      (dbUser.is_active !== undefined && !isTruthyFlag(dbUser.is_active)) ||
      (typeof dbUser.status === 'string' && dbUser.status.toLowerCase() !== 'active')
    ) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Usuário inativo'
      });
    }

    const passwordMatches = await verifyPassword(password, dbUser);

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário ou senha incorretos'
      });
    }

    const user = mapUserFromDb(dbUser);

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
      user
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
 * PATCH /api/auth/change-credentials
 * Altera username e senha do usuário autenticando com credenciais atuais
 *
 * Body: { currentUsername, currentPassword, newUsername, newPassword }
 */
router.patch('/change-credentials', async (req, res) => {
  try {
    const { currentUsername, currentPassword, newUsername, newPassword } = req.body;

    if (!currentUsername || !currentPassword || !newUsername || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'currentUsername, currentPassword, newUsername e newPassword são obrigatórios'
      });
    }

    if (typeof newUsername !== 'string' || newUsername.trim().length < 3) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'newUsername deve ter no mínimo 3 caracteres'
      });
    }

    const passwordValidationMessage = validateNewPassword(newPassword);
    if (passwordValidationMessage) {
      return res.status(400).json({
        error: 'Bad Request',
        message: passwordValidationMessage
      });
    }

    const db = req.db;
    if (!db) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Conexão com banco indisponível'
      });
    }

    const usersTable = process.env.AUTH_USERS_TABLE || 'users';
    const hasUsersTable = await db.schema.hasTable(usersTable);

    if (!hasUsersTable) {
      return res.status(503).json({
        error: 'Service Unavailable',
        message: `Tabela de autenticação '${usersTable}' não encontrada no banco`,
        hint: 'Configure AUTH_USERS_TABLE ou crie a tabela users'
      });
    }

    const trimmedCurrentUsername = currentUsername.trim();
    const trimmedNewUsername = newUsername.trim();

    const dbUser = await db(usersTable)
      .where({ username: trimmedCurrentUsername })
      .first();

    if (!dbUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciais atuais inválidas'
      });
    }

    const passwordMatches = await verifyPassword(currentPassword, dbUser);
    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Credenciais atuais inválidas'
      });
    }

    if (trimmedCurrentUsername !== trimmedNewUsername) {
      const usernameInUse = await db(usersTable)
        .where({ username: trimmedNewUsername })
        .whereNot({ id: dbUser.id })
        .first();

      if (usernameInUse) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'newUsername já está em uso'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const updateData = {
      username: trimmedNewUsername,
      password_hash: hashedPassword
    };

    const hasPasswordColumn = await db.schema.hasColumn(usersTable, 'password');
    if (hasPasswordColumn) {
      updateData.password = hashedPassword;
    }

    const hasUpdatedAtColumn = await db.schema.hasColumn(usersTable, 'updated_at');
    if (hasUpdatedAtColumn) {
      updateData.updated_at = db.fn.now();
    }

    await db(usersTable)
      .where({ id: dbUser.id })
      .update(updateData);

    console.log('[AUTH][CHANGE_CREDENTIALS][SUCCESS]', {
      userId: dbUser.id,
      oldUsername: trimmedCurrentUsername,
      newUsername: trimmedNewUsername,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Credenciais atualizadas com sucesso',
      user: {
        id: String(dbUser.id),
        username: trimmedNewUsername
      }
    });
  } catch (error) {
    console.error('[AUTH][CHANGE_CREDENTIALS][ERROR]', error);
    return res.status(500).json({
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
