import { Request, Response } from 'express';
import { AppError } from '@/shared/exceptions/AppError';

export function notFoundHandler(req: Request, res: Response): void {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  );
  
  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  });
}