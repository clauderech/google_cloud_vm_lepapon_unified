import React from 'react';
import { AlertCircle, Lock, LogIn, XCircle, Wifi, AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  status?: number;
  message: string;
  type?: 'forbidden' | 'unauthorized' | 'validation' | 'server' | 'network';
  details?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  showIcon?: boolean;
}

/**
 * Componente que exibe erros de API de forma amigável
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  status,
  message,
  type = 'server',
  details,
  onDismiss,
  onRetry,
  showIcon = true
}) => {
  const getErrorStyle = (type: string) => {
    switch (type) {
      case 'forbidden':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800',
          icon: <Lock className="w-5 h-5" />
        };
      case 'unauthorized':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          badge: 'bg-orange-100 text-orange-800',
          icon: <LogIn className="w-5 h-5" />
        };
      case 'validation':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: <AlertTriangle className="w-5 h-5" />
        };
      case 'network':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          icon: <Wifi className="w-5 h-5" />
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800',
          icon: <XCircle className="w-5 h-5" />
        };
    }
  };

  const style = getErrorStyle(type);
  const icon = showIcon ? style.icon : <AlertCircle className="w-5 h-5" />;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 flex items-start gap-3 mb-4`}>
      <div className={`${style.text} flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-semibold ${style.text}`}>
            {type === 'forbidden' && '🔒 Acesso Negado'}
            {type === 'unauthorized' && '🔓 Sessão Expirada'}
            {type === 'validation' && '⚠️ Erro de Validação'}
            {type === 'network' && '📡 Erro de Conexão'}
            {!['forbidden', 'unauthorized', 'validation', 'network'].includes(type) && '❌ Erro'}
          </h3>
          {status && (
            <span className={`text-xs font-mono ${style.badge} px-2 py-0.5 rounded`}>
              HTTP {status}
            </span>
          )}
        </div>
        
        <p className={`text-sm ${style.text}`}>
          {message}
        </p>
        
        {details && (
          <p className={`text-xs ${style.text} opacity-75 mt-2 font-mono`}>
            {details}
          </p>
        )}

        {(onDismiss || onRetry) && (
          <div className="flex gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`text-xs font-medium px-3 py-1 rounded ${style.badge} hover:opacity-80 transition-opacity`}
              >
                🔄 Tentar Novamente
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-xs font-medium px-3 py-1 rounded ${style.badge} hover:opacity-80 transition-opacity`}
              >
                ✕ Descartar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ErrorNotificationProps {
  isVisible: boolean;
  type: 'forbidden' | 'unauthorized' | 'validation' | 'server' | 'network';
  message: string;
  onClose?: () => void;
  autoClose?: number; // ms
}

/**
 * Notificação flutuante para erros
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  isVisible,
  type,
  message,
  onClose,
  autoClose = 5000
}) => {
  React.useEffect(() => {
    if (!isVisible || !autoClose) return;
    
    const timer = setTimeout(() => {
      onClose?.();
    }, autoClose);
    
    return () => clearTimeout(timer);
  }, [isVisible, autoClose, onClose]);

  if (!isVisible) return null;

  const colors = {
    forbidden: 'bg-red-500',
    unauthorized: 'bg-orange-500',
    validation: 'bg-yellow-500',
    network: 'bg-blue-500',
    server: 'bg-red-500'
  };

  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-4 py-3 rounded shadow-lg flex items-start gap-2 max-w-md z-50 animate-slide-in`}>
      <div className="mt-0.5">
        {type === 'forbidden' && '🔒'}
        {type === 'unauthorized' && '🔓'}
        {type === 'validation' && '⚠️'}
        {type === 'network' && '📡'}
        {type === 'server' && '❌'}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-white hover:opacity-80 transition-opacity"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Componente de acesso negado em tela cheia
 */
export const AccessDeniedScreen: React.FC<{
  reason?: string;
  requiredRole?: string;
  onGoBack?: () => void;
}> = ({ reason, requiredRole, onGoBack }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🔒</div>
        
        <h1 className="text-2xl font-bold text-red-800 mb-2">
          Acesso Negado
        </h1>
        
        <p className="text-gray-600 mb-4">
          {reason || 'Você não tem permissão para acessar este recurso.'}
        </p>

        {requiredRole && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm">
            <p className="text-red-800">
              <strong>Requer:</strong> {requiredRole}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              ← Voltar
            </button>
          )}
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
};
