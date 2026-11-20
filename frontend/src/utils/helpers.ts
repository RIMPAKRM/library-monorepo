import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Объединение классов с tailwind-merge */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Форматирование даты */
export function formatDate(date: string | Date | undefined, format: string = 'dd.MM.yyyy'): string {
  if (date === undefined || date === null) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '—';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('dd', day)
    .replace('MM', month)
    .replace('yyyy', String(year))
    .replace('HH', hours)
    .replace('mm', minutes);
}

/** Относительное время (например, "2 часа назад") */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'только что';
  if (diffMin < 60) return `${diffMin} мин. назад`;
  if (diffHour < 24) return `${diffHour} ч. назад`;
  if (diffDay < 7) return `${diffDay} дн. назад`;
  
  return formatDate(d);
}

/** Debounce функция */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/** Генерация ID */
export function generateId(): string {
  return crypto.randomUUID();
}

/** Обрезка текста */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/** Капитализация первой буквы */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Получение инициалов */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
}

/** Проверка просроченности */
export function isOverdue(dueDate: string | Date): boolean {
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return new Date() > due;
}

/** Дни до даты */
export function daysUntil(date: string | Date): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** Безопасный JSON parse */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/** Очистка объекта от undefined/null */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/** Глубокое клонирование */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}