import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ProtectedButtonProps {
  children: React.ReactNode;
  permission: string;
  requiredRole?: 'admin' | 'operador' | 'caixa';
  hasPermission: boolean;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  tooltip?: string;
}

/**
 * Botão que verifica permissões antes de renderizar
 * Desabilita se o usuário não tem permissão
 */
export const ProtectedButton: React.FC<ProtectedButtonProps> = ({
  children,
  permission,
  requiredRole,
  hasPermission,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  tooltip
}) => {
  const isDisabled = disabled || !hasPermission;

  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-400'
  };

  const fullClassName = `
    ${variantStyles[variant]}
    px-4 py-2 rounded font-medium transition-colors duration-200
    disabled:cursor-not-allowed disabled:opacity-50
    ${className}
  `;

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={fullClassName}
        title={tooltip || (isDisabled ? `Você não tem permissão para esta ação: ${permission}` : '')}
      >
        {children}
      </button>
      
      {isDisabled && !disabled && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          ⛔ Sem permissão: {permission}
          {requiredRole && <br />}
          {requiredRole && `(Requer: ${requiredRole})`}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

interface ProtectedSectionProps {
  children: React.ReactNode;
  permission: string;
  requiredRole?: 'admin' | 'operador' | 'caixa';
  hasPermission: boolean;
  title?: string;
  fallback?: React.ReactNode;
}

/**
 * Seção que é ocultada se o usuário não tem permissão
 */
export const ProtectedSection: React.FC<ProtectedSectionProps> = ({
  children,
  permission,
  requiredRole,
  hasPermission,
  title,
  fallback
}) => {
  if (!hasPermission) {
    return (
      <>
        {fallback ? (
          fallback
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Acesso Restrito</h3>
              <p className="text-sm text-yellow-700">
                Você não tem permissão para visualizar: <strong>{permission}</strong>
              </p>
              {requiredRole && (
                <p className="text-xs text-yellow-600 mt-1">
                  Requer role: <strong>{requiredRole}</strong>
                </p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {title && <h2 className="text-lg font-bold mb-4">{title}</h2>}
      {children}
    </>
  );
};

interface ProtectedIconProps {
  icon: React.ReactNode;
  permission: string;
  hasPermission: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Ícone clicável que verifica permissões
 */
export const ProtectedIcon: React.FC<ProtectedIconProps> = ({
  icon,
  permission,
  hasPermission,
  onClick,
  className = ''
}) => {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        disabled={!hasPermission}
        className={`disabled:opacity-50 disabled:cursor-not-allowed hover:text-blue-600 transition-colors ${className}`}
      >
        {icon}
      </button>
      
      {!hasPermission && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
          Sem permissão: {permission}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};
