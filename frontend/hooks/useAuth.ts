import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'operador' | 'caixa';
  loginAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const STORAGE_KEY = 'lanchonete_session';

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

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Carregar sessão do localStorage
    const savedSession = localStorage.getItem(STORAGE_KEY);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
      } catch (e) {
        console.error('Erro ao carregar sessão:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const rolePermissions = PERMISSIONS[user.role] || [];
    return rolePermissions.includes(permission);
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission
  };
};
