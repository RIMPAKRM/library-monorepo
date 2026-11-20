import { Router } from 'express';
import { copyController } from '@/modules/copies/copy.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const router = Router();

// All copy routes require authentication
router.use(authMiddleware);

// Read - all authenticated users
router.get('/', copyController.getCopies);
router.get('/:id', copyController.getCopyById);

// Write - librarian or moderator
router.post('/', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), copyController.createCopy);
router.patch('/:id', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), copyController.updateCopy);
router.delete('/:id', requireRole(UserRole.MODERATOR), copyController.deleteCopy);

export { router as copyRoutes };