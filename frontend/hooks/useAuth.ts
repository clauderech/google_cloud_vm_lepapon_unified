import { createContext, useContext, useState, useEffect, ReactNode, createElement } from 'react';
import * as authService from '../services/authService';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operador' | 'caixa';
  loginAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, authToken?: string) => void;
  loginWithCredentials: (username: string, password: string) => Promise<{ user: User; token: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'lanchonete_session';
const AuthContext = createContext<AuthState | undefined>(undefined);

// Definição de permissões por role
const PERMISSIONS = {
  admin: [
    'view_dashboard',
    'view_pos',
    'view_inventory',
    'view_shopping_list',
    'view_purchases',
    'view_financial',
    'view_expenses',
    'view_cash_register',
    'view_reports',
    'view_kitchen',
    'manage_products',
    'manage_suppliers',
    'manage_users',
    'close_cash',
    'edit_sales',
    'delete_items'
  ],
  operador: [
    'view_dashboard',
    'view_pos',
    'view_inventory',
    'view_shopping_list',
    'view_purchases',
    'view_kitchen',
    'manage_products',
    'view_reports'
  ],
  caixa: [
    'view_pos',
    'view_cash_register',
    'close_cash',
    'view_dashboard'
  ]
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregar sessão do localStorage na inicialização
    const savedSession = localStorage.getItem(STORAGE_KEY);
    const savedToken = authService.getAuthToken();
    const storedUser = authService.getStoredUser();

    if (savedToken) {
      setToken(savedToken);
      if (storedUser) {
        setUser(storedUser);
      } else if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          setUser(parsed);
        } catch (e) {
          console.error('Erro ao carregar sessão:', e);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, []);

  const login = (userData: User, authToken?: string) => {
    const normalizedUser: User = {
      ...userData,
      loginAt: userData.loginAt || new Date().toISOString()
    };

    let nextToken = authToken || authService.getAuthToken();
    if (!nextToken) {
      // Fallback para login local/offline sem backend.
      nextToken = `session_${normalizedUser.role}_${normalizedUser.id}_${Date.now()}`;
      authService.setAuthToken(nextToken);
    }

    setToken(nextToken);
    setUser(normalizedUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
    setError(null);
  };

  const loginWithCredentials = async (username: string, password: string): Promise<{ user: User; token: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.login(username, password);
      const normalizedUser: User = {
        ...data.user,
        loginAt: data.user.loginAt || new Date().toISOString()
      };

      setUser(normalizedUser);
      setToken(data.token);

      // Manter compatibilidade com localStorage antigo
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedUser));
      
      console.log('[useAuth] Login bem-sucedido com credenciais');
      return { user: normalizedUser, token: data.token };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMessage);
      console.error('[useAuth] Erro ao fazer login:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
      
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
      
      console.log('[useAuth] Logout bem-sucedido');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fazer logout';
      setError(errorMessage);
      console.error('[useAuth] Erro ao fazer logout:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const rolePermissions = PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  };

  const value: AuthState = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    login,
    loginWithCredentials,
    logout,
    hasPermission,
    isLoading,
    error
  };

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};
