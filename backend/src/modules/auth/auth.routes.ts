import { Router } from 'express';
import { authController } from '@/modules/auth/auth.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/rotate', authController.rotate);

// Protected routes
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getProfile);

export { router as authRoutes };