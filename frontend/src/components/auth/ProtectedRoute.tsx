import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { STORAGE_KEYS } from '@/constants';
import { IUser } from '@/types';

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Отсекает мусорные значения вроде "undefined", попавшие в localStorage */
function isValidToken(token: string | null): token is string {
  return Boolean(token) && token !== 'undefined' && token !== 'null';
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, setAuth, setLoading, logout, user } = useAuthStore();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const refreshToken = isValidToken(storedRefreshToken) ? storedRefreshToken : undefined;
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      // Токена нет — сессии нет, сразу на вход (без белого экрана)
      if (!isValidToken(accessToken)) {
        logout();
        setLoading(false);
        if (!cancelled) setIsInitializing(false);
        return;
      }

      // Пользователь уже в сторе — восстановим флаги, если нужно
      if (user) {
        if (!useAuthStore.getState().isAuthenticated) {
          setAuth({ user, accessToken, refreshToken });
        } else {
          setLoading(false);
        }
        if (!cancelled) setIsInitializing(false);
        return;
      }

      // Есть сохранённый пользователь — восстанавливаем сессию из него
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser) as IUser;
          setAuth({ user: parsedUser, accessToken, refreshToken });
          if (!cancelled) setIsInitializing(false);
          return;
        } catch {
          // Повреждённые данные — попробуем загрузить профиль с сервера
        }
      }

      // Есть токен, но нет пользователя — запрашиваем профиль
      try {
        const profile = (await api.getProfile()) as IUser;
        if (cancelled) return;
        setAuth({ user: profile, accessToken, refreshToken });
      } catch {
        if (cancelled) return;
        logout();
        setLoading(false);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };

    initAuth();

    return () => {
      cancelled = true;
    };
  }, [user, setAuth, setLoading, logout]);

  if (isInitializing || isLoading) {
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
