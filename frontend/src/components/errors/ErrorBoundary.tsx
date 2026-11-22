import { Component, ErrorInfo, ReactNode } from 'react';
import { STORAGE_KEYS } from '@/constants';

interface IErrorBoundaryProps {
  children: ReactNode;
}

interface IErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Страховка от «белого экрана»: любая необработанная ошибка рендера
 * показывает понятное сообщение вместо пустой страницы.
 */
export class ErrorBoundary extends Component<IErrorBoundaryProps, IErrorBoundaryState> {
  state: IErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): IErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Неизвестная ошибка',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Необработанная ошибка интерфейса:', error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoToLogin = (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem('auth-storage');
    window.location.replace('/login');
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 mb-4">
            <i className="bi bi-exclamation-triangle text-red-600 text-3xl" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900">Что-то пошло не так</h1>
          <p className="text-secondary-500 mt-2 text-sm">
            Интерфейс столкнулся с ошибкой. Попробуйте обновить страницу или войти заново.
          </p>
          {this.state.message && (
            <p className="mt-3 text-xs text-secondary-400 break-words">{this.state.message}</p>
          )}
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button type="button" className="btn-outline" onClick={this.handleGoToLogin}>
              <i className="bi bi-box-arrow-in-right mr-1" /> Войти заново
            </button>
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              <i className="bi bi-arrow-clockwise mr-1" /> Обновить страницу
            </button>
          </div>
        </div>
      </div>
    );
  }
}
