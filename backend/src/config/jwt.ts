import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { UserRole } from '@/modules/users/user.model';

export interface IJWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/** Generate access token */
export function generateAccessToken(payload: IJWTPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

/** Generate refresh token */
export function generateRefreshToken(payload: IJWTPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

/** Verify access token */
export function verifyAccessToken(token: string): IJWTPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as IJWTPayload;
}

/** Verify refresh token */
export function verifyRefreshToken(token: string): IJWTPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as IJWTPayload;
}

/** Extract token from Authorization header */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/** Decode token without verification (for logging/debugging) */
export function decodeToken(token: string): IJWTPayload | null {
  try {
    return jwt.decode(token) as IJWTPayload;
  } catch {
    return null;
  }
}