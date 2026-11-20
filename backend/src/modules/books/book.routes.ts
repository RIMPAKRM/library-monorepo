import { Router } from 'express';
import { bookController } from '@/modules/books/book.controller';
import { copyController } from '@/modules/copies/copy.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const router = Router();

// All book routes require authentication
router.use(authMiddleware);

// Nested copy routes (/api/books/:bookId/copies)
router.get('/:bookId/copies', copyController.getCopiesByBook);
router.post(
  '/:bookId/copies',
  requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR),
  copyController.createCopyForBook
);

// Public (for authenticated users) - read
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBookById);

// Write - librarian or moderator
router.post('/', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), bookController.createBook);
router.patch('/:id', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), bookController.updateBook);
router.delete('/:id', requireRole(UserRole.MODERATOR), bookController.deleteBook);

export { router as bookRoutes };