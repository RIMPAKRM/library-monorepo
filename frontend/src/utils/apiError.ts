import { AxiosError } from 'axios';

interface IApiErrorBody {
  error?: {
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
  message?: string;
}

/** Достаёт читаемое сообщение об ошибке из ответа API */
export function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<IApiErrorBody>;
  const details = axiosError.response?.data?.error?.details;

  if (details && details.length > 0) {
    return details.map((detail) => detail.message).join('; ');
  }

  return (
    axiosError.response?.data?.error?.message ||
    axiosError.response?.data?.message ||
    axiosError.message ||
    'Произошла ошибка. Попробуйте ещё раз.'
  );
}
