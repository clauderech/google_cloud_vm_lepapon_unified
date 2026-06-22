/**
 * Serviço de Autenticação
 * Gerencia tokens de sessão no frontend
 */

const STORAGE_KEY = 'lanchonete_auth_token';
const USER_STORAGE_KEY = 'lanchonete_user';

/**
 * Armazena o token de autenticação
 */
export const setAuthToken = (token: string) => {
  localStorage.setItem(STORAGE_KEY, token);
  console.log('[AUTH] Token armazenado');
};

/**
 * Obtém o token de autenticação armazenado
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEY);
};

/**
 * Remove o token de autenticação
 */
export const clearAuthToken = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  console.log('[AUTH] Token removido');
};

/**
 * Retorna headers com o token de autenticação
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Faz login com credenciais
 */
export const login = async (username: string, password: string) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Armazenar token e dados do usuário
    setAuthToken(data.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));

    console.log('[AUTH] Login bem-sucedido', data.user);
    return data;
  } catch (error) {
    console.error('[AUTH] Erro ao fazer login:', error);
    throw error;
  }
};

/**
 * Faz logout
 */
export const logout = async () => {
  try {
    const headers = getAuthHeaders();
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers
    }).catch(() => {
      // Ignorar erro se o servidor não responder
    });

    clearAuthToken();
    console.log('[AUTH] Logout bem-sucedido');
  } catch (error) {
    console.error('[AUTH] Erro ao fazer logout:', error);
    clearAuthToken();
  }
};

/**
 * Obtém dados do usuário armazenados
 */
export const getStoredUser = () => {
  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Verifica se há sessão ativa
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Obtém token de teste (apenas desenvolvimento)
 */
export const getTestToken = async () => {
  try {
    const response = await fetch('/api/auth/test-token');
    const data = await response.json();
    setAuthToken(data.token);
    return data.token;
  } catch (error) {
    console.error('[AUTH] Erro ao obter token de teste:', error);
    throw error;
  }
};
