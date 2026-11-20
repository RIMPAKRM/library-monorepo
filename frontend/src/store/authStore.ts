import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IUser, UserRole } from '@/types';
import { STORAGE_KEYS } from '@/constants';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (data: { user: IUser; accessToken: string; refreshToken: string }) => void;
  setUser: (user: IUser) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  updateTokens: (accessToken: string, refreshToken: string) => void;
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
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
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
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(user.role);
      },

      updateTokens: (accessToken, refreshToken) => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        set({ accessToken, refreshToken });
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
        if (state) {
          state.isLoading = false;
        }
      },
    }
  )
);

/** Хук для проверки авторизации */
export function useAuth() {
  const { user, isAuthenticated, isLoading, hasRole, logout } = useAuthStore();
  return { user, isAuthenticated, isLoading, hasRole, logout };
}