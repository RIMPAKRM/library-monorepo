import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole | UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user || !hasRole(roles)) {
    return <Navigate to="/books" replace />;
  }

  return <>{children}</>;
}