import { Router } from 'express';
import { loanController } from '@/modules/loans/loan.controller';
import { authMiddleware } from '@/modules/auth/auth.middleware';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const router = Router();

// All loan routes require authentication
router.use(authMiddleware);

// Reader routes - borrow/return own books
router.post('/', loanController.createLoan);
router.patch('/:id/return', loanController.returnLoan);
router.get('/my', loanController.getMyLoans);

// Librarian/Moderator routes - manage all loans
router.get('/', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), loanController.getLoans);
router.get('/overdue', requireRole(UserRole.LIBRARIAN, UserRole.MODERATOR), loanController.getOverdueLoans);

export { router as loanRoutes };