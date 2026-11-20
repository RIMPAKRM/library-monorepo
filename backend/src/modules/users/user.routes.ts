import { Router } from 'express';
import { userController } from '@/modules/users/user.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// Get users list - moderator only
router.get('/', requireRole(UserRole.MODERATOR), userController.getUsers);

// Get user by ID - moderator or own profile
router.get('/:id', userController.getUserById);

// Update user - moderator or self
router.patch('/:id', userController.updateUser);

// Delete user - moderator only
router.delete('/:id', requireRole(UserRole.MODERATOR), userController.deleteUser);

export { router as userRoutes };