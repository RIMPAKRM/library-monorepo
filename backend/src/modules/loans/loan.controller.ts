import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loanService } from '@/modules/loans/loan.service';
import { LoanStatus } from '@/modules/loans/loan.model';
import { requireRole, requireOwnershipOrModerator } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const createLoanSchema = z.object({
  copyId: z.string().uuid('Invalid copy ID'),
});

export class LoanController {
  /** Create loan - borrow a book (reader) */
  async createLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createLoanSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await loanService.createLoan({ ...data, userId });

      res.status(201).json({
        success: true,
        data: result.loan,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Return a book */
  async returnLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: loanId } = req.params;
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Readers can only return their own loans. Librarians and moderators
      // can return any loan on behalf of a reader.
      const result =
        userRole === UserRole.READER
          ? await loanService.returnLoan(loanId, userId)
          : await loanService.returnLoan(loanId);

      res.json({
        success: true,
        data: result.loan,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get my loans (reader) */
  async getMyLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        status: req.query.status as LoanStatus,
        userId,
      };

      const result = await loanService.getMyLoans(userId, params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get all loans (librarian/moderator) */
  async getLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        userId: req.query.userId as string,
        copyId: req.query.copyId as string,
        status: req.query.status as LoanStatus,
        overdue: req.query.overdue === 'true',
      };

      const result = await loanService.getLoans(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get overdue loans (librarian/moderator) */
  async getOverdueLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const loans = await loanService.getOverdueLoans();

      res.json({
        success: true,
        data: loans,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const loanController = new LoanController();