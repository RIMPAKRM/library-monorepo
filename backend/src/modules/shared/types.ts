/** Shared types for pagination */
export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query parameters for list endpoints */
export interface IQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/** Generic DTO response wrapper */
export interface IApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Role-based access check */
export type RolePermission = 'READER' | 'LIBRARIAN' | 'MODERATOR';