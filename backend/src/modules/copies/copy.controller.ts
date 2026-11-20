import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { copyService } from '@/modules/copies/copy.service';
import { BookCopyStatus } from '@/modules/copies/copy.model';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const createCopySchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
  inventoryNumber: z.string().min(1, 'Inventory number is required'),
  status: z.nativeEnum(BookCopyStatus).default(BookCopyStatus.AVAILABLE),
});

const createCopyForBookSchema = z.object({
  inventoryNumber: z.string().min(1, 'Inventory number is required'),
  status: z.nativeEnum(BookCopyStatus).default(BookCopyStatus.AVAILABLE),
});

const updateCopySchema = z.object({
  inventoryNumber: z.string().min(1).optional(),
  status: z.nativeEnum(BookCopyStatus).optional(),
});

export class CopyController {
  /** Get copies list */
  async getCopies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        bookId: req.query.bookId as string,
        status: req.query.status as BookCopyStatus,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
      };

      const result = await copyService.getCopies(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get copy by ID */
  async getCopyById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const copy = await copyService.getCopyById(id);

      res.json({
        success: true,
        data: copy,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get all copies of a specific book (nested route) */
  async getCopiesByBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookId } = req.params;
      const copies = await copyService.getCopiesByBook(bookId);

      res.json({
        success: true,
        data: copies,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Create copy for a specific book (nested route) */
  async createCopyForBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bookId } = req.params;
      const data = createCopyForBookSchema.parse(req.body);
      const copy = await copyService.createCopy({ ...data, bookId });

      res.status(201).json({
        success: true,
        data: copy,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Create copy (librarian or moderator) */
  async createCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createCopySchema.parse(req.body);
      const copy = await copyService.createCopy(data);

      res.status(201).json({
        success: true,
        data: copy,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Update copy (librarian or moderator) */
  async updateCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateCopySchema.parse(req.body);
      const copy = await copyService.updateCopy(id, data);

      res.json({
        success: true,
        data: copy,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Delete copy (moderator only) */
  async deleteCopy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await copyService.deleteCopy(id);

      res.json({
        success: true,
        message: 'Copy deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const copyController = new CopyController();