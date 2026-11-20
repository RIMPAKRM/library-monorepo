import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, setAuth, setLoading, user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      // Если есть токен но нет пользователя - пробуем загрузить профиль
      const accessToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (accessToken && storedUser && !user) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setAuth({
            user: parsedUser,
            accessToken,
            refreshToken: localStorage.getItem('refresh_token') || '',
          });
        } catch {
          // Токен невалиден, очистим
          localStorage.clear();
          setLoading(false);
        }
      } else if (accessToken && !storedUser) {
        // Есть токен, но нет юзера - пробуем получить профиль
        try {
          const userData = await api.getProfile();
          setAuth({
            user: userData as any,
            accessToken,
            refreshToken: localStorage.getItem('refresh_token') || '',
          });
        } catch {
          localStorage.clear();
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
  }, [user, setAuth, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}