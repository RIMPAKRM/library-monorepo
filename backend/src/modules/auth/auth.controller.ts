import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '@/modules/auth/auth.service';
import { AppError } from '@/shared/exceptions/AppError';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  /** Register new user */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = registerSchema.parse(req.body);
      const result = await authService.register(data);

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        data: {
          user: result.user.toSafeObject(),
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Login user */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: {
          user: result.user.toSafeObject(),
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Refresh access token */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get refresh token from cookie or body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      
      if (!refreshToken) {
        throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
      }

      const accessToken = await authService.refreshAccessToken(refreshToken);

      res.json({
        success: true,
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Rotate refresh token */
  async rotate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      
      if (!refreshToken) {
        throw new AppError('Refresh token required', 401, 'REFRESH_TOKEN_REQUIRED');
      }

      const { accessToken, refreshToken: newRefreshToken } = 
        await authService.rotateRefreshToken(refreshToken);

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        data: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  /** Logout */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get current user profile */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.user is set by auth middleware
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const user = await authService.getProfile(userId);

      res.json({
        success: true,
        data: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();