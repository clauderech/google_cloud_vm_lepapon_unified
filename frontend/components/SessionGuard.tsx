import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useApiError } from '../hooks/useApiError';

interface SessionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente que monitora a sessão e redireciona para login se expirar
 */
export const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
  fallback
}) => {
  const [isValidSession, setIsValidSession] = React.useState(true);
  const { error, handleError, clearError } = useApiError();

  useEffect(() => {
    // Verificar se o token é válido a cada 1 minuto
    const checkSessionValidity = async () => {
      try {
        const token = localStorage.getItem('lanchonete_auth_token');
        
        if (!token) {
          setIsValidSession(false);
          return;
        }

        // Tentar fazer uma requisição de teste
        const response = await fetch('/api/auth/test-token', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          setIsValidSession(false);
          localStorage.removeItem('lanchonete_auth_token');
        } else if (response.ok) {
          clearError();
        }
      } catch (err) {
        console.warn('[SessionGuard] Erro ao verificar sessão:', err);
      }
    };

    const interval = setInterval(checkSessionValidity, 60000); // A cada 1 minuto
    checkSessionValidity(); // Verificar imediatamente

    return () => clearInterval(interval);
  }, [clearError]);

  if (!isValidSession) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔓</div>
          
          <h1 className="text-2xl font-bold text-orange-800 mb-2">
            Sessão Expirada
          </h1>
          
          <p className="text-gray-600 mb-6">
            Sua sessão expirou. Por favor, faça login novamente.
          </p>

          <button
            onClick={() => window.location.href = '/login'}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            🔐 Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

interface TokenRefreshProps {
  children: React.ReactNode;
}

/**
 * Componente que faz refresh automático do token antes de expirar
 */
export const TokenRefresh: React.FC<TokenRefreshProps> = ({ children }) => {
  useEffect(() => {
    // Refresh token a cada 5 minutos
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('lanchonete_auth_token');
        if (!token) return;

        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('lanchonete_auth_token', data.token);
            console.log('[TokenRefresh] Token renovado com sucesso');
          }
        }
      } catch (err) {
        console.warn('[TokenRefresh] Erro ao renovar token:', err);
      }
    }, 5 * 60 * 1000); // A cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
};

interface AutoLogoutProps {
  children: React.ReactNode;
  inactivityTimeout?: number; // ms
}

/**
 * Componente que faz logout automático após inatividade
 */
export const AutoLogout: React.FC<AutoLogoutProps> = ({
  children,
  inactivityTimeout = 30 * 60 * 1000 // 30 minutos
}) => {
  const logoutRef = React.useRef<NodeJS.Timeout>();

  const resetInactivityTimer = React.useCallback(() => {
    if (logoutRef.current) {
      clearTimeout(logoutRef.current);
    }

    logoutRef.current = setTimeout(() => {
      console.log('[AutoLogout] Logout por inatividade');
      localStorage.removeItem('lanchonete_session');
      localStorage.removeItem('lanchonete_auth_token');
      window.location.href = '/login';
    }, inactivityTimeout);
  }, [inactivityTimeout]);

  useEffect(() => {
    resetInactivityTimer();

    // Resetar timer em qualquer atividade do usuário
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      if (logoutRef.current) {
        clearTimeout(logoutRef.current);
      }
    };
  }, [resetInactivityTimer]);

  return <>{children}</>;
};

interface LoginStateGuardProps {
  children: React.ReactNode;
  isLoading: boolean;
  error: string | null;
  onClearError?: () => void;
}

/**
 * Componente que mostra loading ou erro durante login
 */
export const LoginStateGuard: React.FC<LoginStateGuardProps> = ({
  children,
  isLoading,
  error,
  onClearError
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="animate-spin">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
        <span className="text-blue-700 font-medium">Autenticando...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-800 font-medium">Erro na autenticação</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-xs font-medium text-red-600 hover:text-red-800 mt-2 underline"
            >
              Descartar
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
