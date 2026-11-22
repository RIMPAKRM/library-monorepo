import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants';
import { STORAGE_KEYS } from '@/constants';
import { IApiResponse, ILoginResponse, IPaginatedResponse, IQueryParams } from '@/types';
import { useAuthStore } from '@/store/authStore';

const isValidStoredToken = (token: string | null): token is string =>
  Boolean(token) && token !== 'undefined' && token !== 'null';

interface IRefreshSubscriber {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: IRefreshSubscriber[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // для httpOnly cookies
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - добавляем access token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (isValidStoredToken(accessToken) && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - обработка 401 и рефреш токена
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Не пытаемся обновлять токен на запросах авторизации:
        // 401 от /auth/login означает неверные данные, а не истёкшую сессию.
        const isAuthRequest = Boolean(
          originalRequest?.url &&
            ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) =>
              originalRequest.url!.includes(path)
            )
        );

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
          if (this.isRefreshing) {
            // Ждем обновления токена
            return new Promise((resolve, reject) => {
              this.refreshSubscribers.push({
                resolve: (token: string) => {
                  if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                  }
                  resolve(this.client(originalRequest));
                },
                reject,
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.refreshSubscribers.forEach((subscriber) => subscriber.resolve(newAccessToken));
            this.refreshSubscribers = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Сессия истекла окончательно: разлогиниваем и уводим на вход,
            // чтобы не оставаться на странице с бесконечными 401.
            this.refreshSubscribers.forEach((subscriber) => subscriber.reject(refreshError));
            this.refreshSubscribers = [];
            this.handleAuthExpired();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /** Обновление access токена через refresh cookie или сохранённый refresh токен */
  private async refreshAccessToken(): Promise<string> {
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const refreshToken = isValidStoredToken(storedRefreshToken) ? storedRefreshToken : undefined;

    const response = await axios.post<IApiResponse<{ accessToken: string }>>(
      `${API_BASE_URL}/auth/refresh`,
      refreshToken ? { refreshToken } : {},
      { withCredentials: true }
    );

    // Бэкенд отвечает { success, data: { accessToken } }
    const newAccessToken = response.data?.data?.accessToken;
    if (!newAccessToken) {
      throw new Error('Не удалось обновить токен: пустой ответ сервера');
    }

    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    useAuthStore.getState().updateTokens(newAccessToken);
    return newAccessToken;
  }

  /** Полный сброс авторизации и переход на страницу входа */
  private handleAuthExpired(): void {
    this.clearAuth();
    useAuthStore.getState().logout();

    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
  }

  private clearAuth(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  // Generic methods
  async get<T>(url: string, params?: IQueryParams): Promise<T> {
    const response = await this.client.get<IApiResponse<T>>(url, { params });
    return response.data.data;
  }

  async getPaginated<T>(url: string, params?: IQueryParams): Promise<IPaginatedResponse<T>> {
    const response = await this.client.get<IApiResponse<IPaginatedResponse<T>>>(url, { params });
    return response.data.data;
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<IApiResponse<T>>(url, data);
    return response.data.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<IApiResponse<T>>(url, data);
    return response.data.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<IApiResponse<T>>(url);
    return response.data.data;
  }

  // Auth methods
  async login(email: string, password: string): Promise<ILoginResponse> {
    const response = await this.client.post<IApiResponse<ILoginResponse>>('/auth/login', { email, password });
    return response.data.data;
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<ILoginResponse> {
    const response = await this.client.post<IApiResponse<ILoginResponse>>('/auth/register', data);
    return response.data.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.clearAuth();
  }

  async getProfile(): Promise<unknown> {
    // Профиль текущего пользователя живёт в auth-модуле (/api/auth/me)
    const response = await this.client.get('/auth/me');
    return response.data.data;
  }
}

export const api = new ApiService();
