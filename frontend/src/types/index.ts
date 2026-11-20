/** Роли пользователей */
export enum UserRole {
  READER = 'READER',
  LIBRARIAN = 'LIBRARIAN',
  MODERATOR = 'MODERATOR',
}

/** Статусы экземпляра книги */
export enum BookCopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  LOST = 'LOST',
}

/** Статусы выдачи */
export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  LOST = 'LOST',
}

/** Статусы очереди */
export enum QueueStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  EXPIRED = 'EXPIRED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

/** Пользователь */
export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** Книга */
export interface IBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  copiesCount: number;
  availableCopiesCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Экземпляр книги */
export interface IBookCopy {
  id: string;
  bookId: string;
  book?: IBook;
  inventoryNumber: string;
  status: BookCopyStatus;
  currentLoan?: ILoan;
  createdAt: string;
  updatedAt: string;
}

/** Выдача книги */
export interface ILoan {
  id: string;
  userId: string;
  user?: IUser;
  copyId: string;
  copy?: IBookCopy;
  loanedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: LoanStatus;
  createdAt: string;
  updatedAt: string;
}

/** Очередь ожидания */
export interface IQueueEntry {
  id: string;
  userId: string;
  user?: IUser;
  bookId: string;
  book?: IBook;
  position: number;
  status: QueueStatus;
  notifiedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** JWT Payload */
export interface IJWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** Auth Tokens */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** API Response */
export interface IApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/** Paginated Response */
export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query Params */
export interface IQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
  author?: string;
  role?: UserRole | string;
  status?: string;
  userId?: string;
  bookId?: string;
  copyId?: string;
  overdue?: boolean;
}

/** Form Errors */
export interface IFormErrors {
  [key: string]: string | undefined;
}