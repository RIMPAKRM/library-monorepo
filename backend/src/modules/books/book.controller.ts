import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { bookService } from '@/modules/books/book.service';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const createBookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  copiesCount: z.number().int().min(0).default(0),
});

const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  isbn: z.string().optional(),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
});

export class BookController {
  /** Get books list */
  async getBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        search: req.query.search as string,
        author: req.query.author as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
      };

      const result = await bookService.getBooks(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get book by ID */
  async getBookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const book = await bookService.getBookById(id);

      res.json({
        success: true,
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Create book (librarian or moderator) */
  async createBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = createBookSchema.parse(req.body);
      const book = await bookService.createBook(data);

      res.status(201).json({
        success: true,
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Update book (librarian or moderator) */
  async updateBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateBookSchema.parse(req.body);
      const book = await bookService.updateBook(id, data);

      res.json({
        success: true,
        data: book,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Delete book (moderator only) */
  async deleteBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await bookService.deleteBook(id);

      res.json({
        success: true,
        message: 'Book deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookController = new BookController();