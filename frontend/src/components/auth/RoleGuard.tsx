import { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

interface RoleGuardProps {
  children?: ReactNode;
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

  // Если контент не передан, рендерим вложенный маршрут.
  // Так RoleGuard можно использовать как обёртку группы роутов
  // без повторного Layout (иначе сайдбар и футер дублируются).
  return <>{children ?? <Outlet />}</>;
}
