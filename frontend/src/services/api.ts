import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/constants';
import { STORAGE_KEYS } from '@/constants';
import { IApiResponse, IPaginatedResponse, IQueryParams } from '@/types';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

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
        if (accessToken && config.headers) {
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

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Ждем обновления токена
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            this.refreshSubscribers.forEach((callback) => callback(newAccessToken));
            this.refreshSubscribers = [];
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.refreshSubscribers = [];
            this.clearAuth();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { withCredentials: true }
    );

    const newAccessToken = response.data.accessToken;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
    return newAccessToken;
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
  async login(email: string, password: string): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data.data;
  }

  async register(data: { email: string; password: string; firstName: string; lastName: string }): Promise<{ user: unknown; accessToken: string; refreshToken: string }> {
    const response = await this.client.post('/auth/register', data);
    return response.data.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.clearAuth();
  }

  async getProfile(): Promise<unknown> {
    const response = await this.client.get('/users/me');
    return response.data.data;
  }
}

export const api = new ApiService();