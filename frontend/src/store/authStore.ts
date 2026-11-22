import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IUser, UserRole } from '@/types';
import { STORAGE_KEYS } from '@/constants';

/** Отсекает мусорные значения вроде "undefined", попавшие в localStorage */
function isValidToken(token: string | null): token is string {
  return Boolean(token) && token !== 'undefined' && token !== 'null';
}

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (data: { user: IUser; accessToken: string; refreshToken?: string }) => void;
  setUser: (user: IUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      setAuth: ({ user, accessToken, refreshToken }) => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        // Бэкенд отдаёт refresh токен только в httpOnly cookie,
        // поэтому в localStorage его может не быть.
        if (isValidToken(refreshToken ?? null)) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken as string);
        } else {
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        }
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        set({
          user,
          accessToken,
          refreshToken: isValidToken(refreshToken ?? null) ? (refreshToken as string) : null,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setUser: (user) => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        set({ user });
      },

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      updateTokens: (accessToken, refreshToken) => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (isValidToken(refreshToken ?? null)) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken as string);
        }
        set((state) => ({
          accessToken,
          refreshToken: isValidToken(refreshToken ?? null)
            ? (refreshToken as string)
            : state.refreshToken,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Синхронизируем стор с реальным содержимым localStorage:
        // если токена нет (истёк/очищен), пользователь считается вышедшим.
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (!isValidToken(accessToken) || !state.user) {
          localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);

          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
        }

        state.isLoading = false;
      },
    }
  )
);

/** Хук для проверки авторизации */
export function useAuth() {
  const { user, isAuthenticated, isLoading, hasRole, logout } = useAuthStore();
  return { user, isAuthenticated, isLoading, hasRole, logout };
}
