/**
 * Middleware de Autenticação Unificada
 * Suporta autenticação via WhatsApp Token + API Key
 */

/**
 * Validar WhatsApp Token
 */
function validateWhatsappToken(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const expectedToken = process.env.WHATSAPP_API_TOKEN;

    if (!token || token !== expectedToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token WhatsApp inválido ou ausente'
      });
    }

    req.auth = { type: 'whatsapp_token' };
    next();
  } catch (error) {
    console.error('[Auth] Erro ao validar token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Validar API Key (para chamadas internas)
 */
function validateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const expectedKey = process.env.API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API Key inválida ou ausente'
      });
    }

    req.auth = { type: 'api_key' };
    next();
  } catch (error) {
    console.error('[Auth] Erro ao validar API Key:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

/**
 * Middleware permissivo para desenvolvimento
 */
function authDevMode(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    req.auth = { type: 'dev_mode' };
    return next();
  }
  
  validateWhatsappToken(req, res, next);
}

/**
 * Validar autenticação combinada
 */
function validateCombined(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const apiKey = req.headers['x-api-key'];
  const devMode = process.env.NODE_ENV === 'development';

  if (devMode) {
    req.auth = { type: 'dev_mode' };
    return next();
  }

  if (token || apiKey) {
    req.auth = { 
      type: token ? 'whatsapp_token' : 'api_key',
      authenticated: true 
    };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Nenhuma credencial válida fornecida'
  });
}

module.exports = {
  validateWhatsappToken,
  validateApiKey,
  authDevMode,
  validateCombined
};
