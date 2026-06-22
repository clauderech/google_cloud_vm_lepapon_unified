import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ForbiddenError {
  type: 'forbidden';
  message: string;
  endpoint: string;
  requiredRole?: string;
}

interface UnauthorizedError {
  type: 'unauthorized';
  message: string;
}

export interface ApiError {
  status: number;
  message: string;
  type: 'forbidden' | 'unauthorized' | 'validation' | 'server' | 'network';
  details?: Record<string, any>;
}

/**
 * Hook para gerenciar erros de API e lidar com 403 e 401
 */
export const useApiError = () => {
  const [error, setError] = useState<ApiError | null>(null);
  const { logout } = useAuth();

  const handleError = useCallback(async (err: any, context?: string) => {
    let apiError: ApiError;

    if (err.status === 403) {
      apiError = {
        status: 403,
        message: 'Você não tem permissão para realizar esta ação',
        type: 'forbidden',
        details: {
          context,
          endpoint: err.url,
          requiredRole: err.requiredRole
        }
      };
      console.warn('[FRONTEND][API][403]', apiError);
    } else if (err.status === 401) {
      apiError = {
        status: 401,
        message: 'Sua sessão expirou. Fazendo logout...',
        type: 'unauthorized'
      };
      console.warn('[FRONTEND][API][401]', apiError);
      
      // Fazer logout automaticamente após 2 segundos
      setTimeout(() => {
        logout();
      }, 2000);
    } else if (err.status >= 400 && err.status < 500) {
      apiError = {
        status: err.status,
        message: err.message || 'Erro na validação de dados',
        type: 'validation',
        details: err.details
      };
      console.warn('[FRONTEND][API][4xx]', apiError);
    } else if (err.status >= 500) {
      apiError = {
        status: err.status,
        message: 'Erro no servidor. Tente novamente mais tarde.',
        type: 'server'
      };
      console.error('[FRONTEND][API][5xx]', apiError);
    } else if (err instanceof TypeError || !navigator.onLine) {
      apiError = {
        status: 0,
        message: 'Erro de conexão. Verifique sua internet.',
        type: 'network'
      };
      console.error('[FRONTEND][API][NETWORK]', apiError);
    } else {
      apiError = {
        status: 0,
        message: err.message || 'Erro desconhecido',
        type: 'server'
      };
      console.error('[FRONTEND][API][UNKNOWN]', apiError);
    }

    setError(apiError);
    return apiError;
  }, [logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getErrorMessage = useCallback((): string => {
    if (!error) return '';
    
    switch (error.type) {
      case 'forbidden':
        return `🔒 Acesso Negado: ${error.message}`;
      case 'unauthorized':
        return `🔓 Sessão Expirada: ${error.message}`;
      case 'validation':
        return `⚠️ Erro de Validação: ${error.message}`;
      case 'network':
        return `📡 Erro de Conexão: ${error.message}`;
      case 'server':
        return `❌ Erro no Servidor: ${error.message}`;
      default:
        return error.message;
    }
  }, [error]);

  return {
    error,
    handleError,
    clearError,
    getErrorMessage,
    isForbidden: error?.type === 'forbidden',
    isUnauthorized: error?.type === 'unauthorized'
  };
};

/**
 * Hook para interceptar erros em requisições e adicionar tratamento de 403/401
 */
export const useApiInterceptor = () => {
  const { error, handleError, clearError } = useApiError();

  const intercept = useCallback(async <T,>(
    apiCall: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      clearError();
      return await apiCall();
    } catch (err) {
      await handleError(err, context);
      return null;
    }
  }, [handleError, clearError]);

  return { intercept, error, clearError };
};
