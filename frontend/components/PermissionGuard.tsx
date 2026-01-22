import React, { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  hideIfNoPermission?: boolean;
}

/**
 * Componente para controlar acesso baseado em permissões
 * 
 * Uso:
 * <PermissionGuard permission="manage_products">
 *   <button>Editar Produto</button>
 * </PermissionGuard>
 */
const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  permission, 
  children, 
  fallback,
  hideIfNoPermission = false
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    if (hideIfNoPermission) {
      return null;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="relative group cursor-not-allowed opacity-50">
        {children}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity rounded pointer-events-none">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg">
            <Lock className="w-4 h-4 text-red-600" />
            <span className="text-xs font-bold text-gray-900">Sem permissão</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;
