/**
 * Auth Service
 * Gerencia autenticação JWT com backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://snackbatio.com.br:3000';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operador' | 'caixa';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

class AuthService {
  private tokenKey = 'auth_token';
  private sessionKey = 'auth_session';
  private expiresAtKey = 'auth_expiresAt';

  /**
   * Login do usuário
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/api/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha na autenticação');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Salvar sessão após login bem-sucedido
   */
  saveSession(loginResponse: LoginResponse): void {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    localStorage.setItem(this.tokenKey, loginResponse.token);
    localStorage.setItem(this.expiresAtKey, expiresAt);

    const session: AuthSession = {
      user: loginResponse.user,
      token: loginResponse.token,
      expiresAt,
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Obter token armazenado
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Obter sessão armazenada
   */
  getSession(): AuthSession | null {
    const session = localStorage.getItem(this.sessionKey);
    if (!session) return null;

    try {
      const parsed = JSON.parse(session);
      
      // Verificar se token expirou
      if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
        this.logout();
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Verificar se usuário está autenticado
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const session = this.getSession();
    return !!(token && session);
  }

  /**
   * Obter cabeçalho Authorization para requisições
   */
  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${token}`,
    };
  }

  /**
   * Registrar novo usuário
   */
  async register(
    username: string,
    password: string,
    name: string,
    role: 'admin' | 'operador' | 'caixa' = 'caixa'
  ): Promise<User> {
    const response = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, name, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha ao registrar');
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Mudar senha
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/users/${userId}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Falha ao mudar senha');
    }
  }

  /**
   * Fazer logout
   */
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.expiresAtKey);
  }

  /**
   * Obter dados do usuário autenticado
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        ...this.getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Não autorizado');
    }

    const data = await response.json();
    return data.data;
  }
}

export const authService = new AuthService();
