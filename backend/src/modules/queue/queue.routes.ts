import { Router } from 'express';
import { queueController } from '@/modules/queue/queue.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const router = Router();

// All queue routes require authentication
router.use(authMiddleware);

// Reader routes - manage own queue
router.post('/', queueController.joinQueue);
router.delete('/:id', queueController.leaveQueue);
router.get('/my', queueController.getMyQueue);
router.patch('/:id/claim', queueController.claimQueueEntry);

// Librarian/Moderator routes - manage all queue
router.get('/', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), queueController.getQueue);
router.patch('/:id/fulfill', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), queueController.fulfillQueueEntry);

export { router as queueRoutes };