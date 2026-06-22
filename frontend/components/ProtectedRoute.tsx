import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AccessDeniedScreen } from './ErrorDisplay';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  requiredRole?: 'admin' | 'operador' | 'caixa' | 'any';
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Wrapper de rota que verifica permissões
 * Se não tem permissão, mostra tela de acesso negado ou redireciona
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  requiredRole = 'any',
  fallback,
  redirectTo
}) => {
  const { user, hasPermission } = useAuth();

  useEffect(() => {
    // Redirecionar se necessário
    if (redirectTo && (!user || (requiredRole !== 'any' && user.role !== requiredRole))) {
      window.location.href = redirectTo;
    }
  }, [user, requiredRole, redirectTo]);

  // Verificar autenticação
  if (!user) {
    return (
      <AccessDeniedScreen
        reason="Você precisa estar logado para acessar este recurso"
        onGoBack={() => window.location.href = '/'}
      />
    );
  }

  // Verificar role
  if (requiredRole !== 'any' && user.role !== requiredRole) {
    return (
      <AccessDeniedScreen
        reason={`Acesso restrito a usuários com role ${requiredRole}`}
        requiredRole={requiredRole}
        onGoBack={() => window.history.back()}
      />
    );
  }

  // Verificar permissão específica
  if (permission && !hasPermission(permission)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <AccessDeniedScreen
        reason={`Você não tem permissão: ${permission}`}
        requiredRole={requiredRole !== 'any' ? requiredRole : undefined}
        onGoBack={() => window.history.back()}
      />
    );
  }

  return <>{children}</>;
};

interface RoleBasedWrapperProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'operador' | 'caixa')[];
  fallback?: React.ReactNode;
}

/**
 * Wrapper que renderiza conteúdo apenas se o usuário tem um dos roles permitidos
 */
export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  children,
  allowedRoles,
  fallback
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};

interface PermissionGuardProps {
  children: React.ReactNode;
  permission: string;
  fallback?: React.ReactNode;
}

/**
 * Guard que renderiza conteúdo apenas se tem permissão
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  fallback
}) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};
