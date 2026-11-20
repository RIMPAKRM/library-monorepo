import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from '@/modules/users/user.service';
import { UserRole } from '@/modules/users/user.model';
import { requireRole } from '@/modules/auth/auth.middleware';

const updateUserSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(Object.values(UserRole) as [string, ...string[]]).optional(),
});

export class UserController {
  /** Get users list (moderator only) */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        search: req.query.search as string,
        role: req.query.role as UserRole,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
      };

      const result = await userService.getUsers(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get user by ID */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.json({
        success: true,
        data: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }

  /** Update user */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateUserSchema.parse(req.body);
      const requesterRole = (req as any).user?.role as UserRole;

      const user = await userService.updateUser(id, data, requesterRole);

      res.json({
        success: true,
        data: user.toSafeObject(),
      });
    } catch (error) {
      next(error);
    }
  }

  /** Delete user (moderator only) */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const requesterId = (req as any).user?.userId;

      await userService.deleteUser(id, requesterId);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();