import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '@/config/env';
import { AppError, ValidationError } from '@/shared/exceptions/AppError';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      'Validation failed',
      error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
    );
    return sendError(res, validationError);
  }

  // Known application errors
  if (error instanceof AppError) {
    return sendError(res, error);
  }

  // Database errors (Sequelize)
  if (error.name === 'SequelizeValidationError') {
    const validationError = new ValidationError(
      'Database validation failed',
      error.errors.map(e => ({
        field: e.path,
        message: e.message,
      }))
    );
    return sendError(res, validationError);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const appError = new AppError(
      'A record with this value already exists',
      409,
      'DUPLICATE_ENTRY'
    );
    return sendError(res, appError);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    const appError = new AppError(
      'Referenced record does not exist',
      400,
      'FOREIGN_KEY_VIOLATION'
    );
    return sendError(res, appError);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    const appError = new AppError('Invalid token', 401, 'INVALID_TOKEN');
    return sendError(res, appError);
  }

  if (error.name === 'TokenExpiredError') {
    const appError = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    return sendError(res, appError);
  }

  // Unknown errors
  const statusCode = 500;
  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  const appError = new AppError(message, statusCode, 'INTERNAL_ERROR');
  sendError(res, appError);
}

function sendError(res: Response, error: AppError): void {
  const response: Record<string, unknown> = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details) {
    response.error = { ...response.error, details: error.details };
  }

  if (env.NODE_ENV !== 'production' && error.stack) {
    response.error = { ...response.error, stack: error.stack };
  }

  res.status(error.statusCode).json(response);
}