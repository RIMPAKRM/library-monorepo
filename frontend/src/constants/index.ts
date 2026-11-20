/** API Base URL */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Роли с отображаемыми именами */
export const ROLE_LABELS: Record<string, string> = {
  READER: 'Читатель',
  LIBRARIAN: 'Библиотекарь',
  MODERATOR: 'Модератор',
};

/** Статусы экземпляров с цветами */
export const COPY_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Доступен', color: 'success' },
  BORROWED: { label: 'На руках', color: 'warning' },
  RESERVED: { label: 'Зарезервирован', color: 'info' },
  LOST: { label: 'Утерян', color: 'danger' },
};

/** Статусы выдач с цветами */
export const LOAN_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Активна', color: 'success' },
  RETURNED: { label: 'Возвращена', color: 'secondary' },
  OVERDUE: { label: 'Просрочена', color: 'danger' },
  LOST: { label: 'Утеряна', color: 'danger' },
};

/** Статусы очереди с цветами */
export const QUEUE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  WAITING: { label: 'В очереди', color: 'info' },
  NOTIFIED: { label: 'Уведомлен', color: 'warning' },
  EXPIRED: { label: 'Истекло', color: 'danger' },
  FULFILLED: { label: 'Выполнено', color: 'success' },
  CANCELLED: { label: 'Отменено', color: 'secondary' },
};

/** Настройки пагинации */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

/** Срок резерва книги (часы) */
export const RESERVATION_HOURS = 48;

/** Максимальный срок выдачи (дни) */
export const MAX_LOAN_DAYS = 14;

/** Debounce delay для поиска (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Пути для навигации */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  BOOKS: '/books',
  BOOK_DETAIL: (id: string) => `/books/${id}`,
  MY_LOANS: '/my-loans',
  MY_QUEUE: '/my-queue',
  PROFILE: '/profile',
  LIBRARIAN: '/librarian',
  ADMIN: '/admin',
} as const;

/** Хранилище токенов */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const;

/** Форматы дат */
export const DATE_FORMATS = {
  SHORT: 'dd.MM.yyyy',
  LONG: 'dd MMMM yyyy',
  DATETIME: 'dd.MM.yyyy HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
} as const;