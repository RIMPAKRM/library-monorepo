import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, IJWTPayload } from '@/config/jwt';
import { UnauthorizedError } from '@/shared/exceptions/AppError';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: IJWTPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/** Optional auth - doesn't throw if no token */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = payload;
    }
    next();
  } catch {
    // Ignore errors, continue without user
    next();
  }
}

/** Role-based authorization middleware */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new UnauthorizedError('Insufficient permissions'));
    }

    next();
  };
}

/** Check if user owns resource or is moderator */
export function requireOwnershipOrModerator(getUserId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const resourceUserId = getUserId(req);
    const isOwner = req.user.userId === resourceUserId;
    const isModerator = req.user.role === 'MODERATOR';

    if (!isOwner && !isModerator) {
      return next(new UnauthorizedError('Access denied'));
    }

    next();
  };
}