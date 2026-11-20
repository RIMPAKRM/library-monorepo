import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { queueService } from '@/modules/queue/queue.service';
import { QueueStatus } from '@/modules/queue/queue.model';
import { requireRole } from '@/modules/auth/auth.middleware';
import { UserRole } from '@/modules/users/user.model';

const joinQueueSchema = z.object({
  bookId: z.string().uuid('Invalid book ID'),
});

export class QueueController {
  /** Join queue for a book */
  async joinQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = joinQueueSchema.parse(req.body);
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await queueService.joinQueue({ ...data, userId });

      res.status(201).json({
        success: true,
        data: result.entry,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Leave queue */
  async leaveQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: entryId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      await queueService.leaveQueue(entryId, userId);

      res.json({
        success: true,
        message: 'Left the queue successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get my queue entries */
  async getMyQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        status: req.query.status as QueueStatus,
        userId,
      };

      const result = await queueService.getMyQueue(userId, params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Get all queue entries (librarian/moderator) */
  async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: parseInt(req.query.page as string) || 1,
        limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
        userId: req.query.userId as string,
        bookId: req.query.bookId as string,
        status: req.query.status as QueueStatus,
      };

      const result = await queueService.getQueue(params);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /** Claim a reserved copy (reader) */
  async claimQueueEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: entryId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const entry = await queueService.claimQueueEntry(entryId, userId);

      res.json({
        success: true,
        data: entry,
        message: 'Book issued successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /** Fulfill queue entry (librarian/moderator) */
  async fulfillQueueEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: entryId } = req.params;
      const entry = await queueService.fulfillQueueEntry(entryId);

      res.json({
        success: true,
        data: entry,
        message: 'Queue entry fulfilled',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const queueController = new QueueController();