import { QueueEntry } from '@/modules/queue/queue.model';
import { QueueStatus } from '@/modules/queue/queue.model';
import { Book } from '@/modules/books/book.model';
import { BookCopy, BookCopyStatus } from '@/modules/copies/copy.model';
import { Loan, LoanStatus } from '@/modules/loans/loan.model';
import { User } from '@/modules/users/user.model';
import { bookService } from '@/modules/books/book.service';
import { sequelize } from '@/config/database';
import { env } from '@/config/env';
import { NotFoundError, ConflictError } from '@/shared/exceptions/AppError';
import { IPaginatedResponse, IQueryParams } from '@/modules/shared/types';
import { Op } from 'sequelize';

export interface IJoinQueueData {
  userId: string;
  bookId: string;
}

const normalizeSortField = (field: string): string => {
  // Convert camelCase to snake_case for Sequelize underscored models
  return field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export interface IQueueListParams extends IQueryParams {
  userId?: string;
  bookId?: string;
  status?: QueueStatus;
}

export class QueueService {
  /** Join queue for a book */
  async joinQueue(data: IJoinQueueData): Promise<{ entry: QueueEntry; message: string }> {
    // Check if user already in queue for this book
    const existing = await QueueEntry.findOne({
      where: {
        userId: data.userId,
        bookId: data.bookId,
        status: { [Op.in]: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
      },
    });
    if (existing) {
      throw new ConflictError('You are already in the queue for this book');
    }

    // Verify book exists
    const book = await Book.findByPk(data.bookId);
    if (!book) {
      throw new NotFoundError('Book', data.bookId);
    }

    // Verify user exists
    const user = await User.findByPk(data.userId);
    if (!user) {
      throw new NotFoundError('User', data.userId);
    }

    // Get next position
    const lastEntry = await QueueEntry.findOne({
      where: {
        bookId: data.bookId,
        status: { [Op.in]: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
      },
      order: [['position', 'DESC']],
    });

    const position = lastEntry ? lastEntry.position + 1 : 1;

    const entry = await QueueEntry.create({
      userId: data.userId,
      bookId: data.bookId,
      position,
      status: QueueStatus.WAITING,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });

    return {
      entry,
      message: `You are #${position} in the queue for "${book.title}"`,
    };
  }

  /** Leave queue (cancel) */
  async leaveQueue(entryId: string, userId: string): Promise<void> {
    const entry = await QueueEntry.findByPk(entryId);
    if (!entry) {
      throw new NotFoundError('Queue entry', entryId);
    }

    if (entry.userId !== userId) {
      throw new ConflictError('You can only leave your own queue entry');
    }

    if (entry.status !== QueueStatus.WAITING && entry.status !== QueueStatus.NOTIFIED) {
      throw new ConflictError(`Cannot leave queue entry with status ${entry.status}`);
    }

    // Update status to cancelled
    entry.status = QueueStatus.CANCELLED;
    await entry.save();

    // Recalculate positions for remaining waiting entries
    await this.recalculatePositions(entry.bookId);
  }

  /** Get my queue entries */
  async getMyQueue(userId: string, params: IQueueListParams): Promise<IPaginatedResponse<QueueEntry>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = { userId };
    if (params.status) {
      where.status = params.status;
    }

    const { rows, count } = await QueueEntry.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author', 'coverUrl'],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /** Get all queue entries (librarian/moderator) */
  async getQueue(params: IQueueListParams): Promise<IPaginatedResponse<QueueEntry>> {
    const { page = 1, limit = 20, userId, bookId, status, sortBy = 'position', sortOrder = 'ASC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;
    if (status) where.status = status;

    const { rows, count } = await QueueEntry.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'title', 'author'],
        },
      ],
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /** Mark queue entry as fulfilled and issue a copy to the reader */
  async fulfillQueueEntry(entryId: string): Promise<QueueEntry> {
    return this.issueBookForEntry(entryId);
  }

  /** Reader claims the copy reserved for them */
  async claimQueueEntry(entryId: string, userId: string): Promise<QueueEntry> {
    return this.issueBookForEntry(entryId, userId);
  }

  /**
   * Issue an available/reserved copy of the queue entry's book to the reader
   * and mark the queue entry as fulfilled. Runs in a transaction.
   */
  private async issueBookForEntry(entryId: string, userId?: string): Promise<QueueEntry> {
    const transaction = await sequelize.transaction();
    let bookId = '';

    try {
      const entry = await QueueEntry.findByPk(entryId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!entry) {
        throw new NotFoundError('Queue entry', entryId);
      }

      if (userId && entry.userId !== userId) {
        throw new ConflictError('You can only claim your own reservation');
      }

      if (entry.status === QueueStatus.FULFILLED) {
        throw new ConflictError('Queue entry is already fulfilled');
      }

      if (entry.status !== QueueStatus.WAITING && entry.status !== QueueStatus.NOTIFIED) {
        throw new ConflictError(`Cannot issue a book for queue entry with status ${entry.status}`);
      }

      bookId = entry.bookId;

      // Prefer a copy reserved for this queue, otherwise any available copy.
      let copy = await BookCopy.findOne({
        where: { bookId: entry.bookId, status: BookCopyStatus.RESERVED },
        order: [['created_at', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!copy) {
        copy = await BookCopy.findOne({
          where: { bookId: entry.bookId, status: BookCopyStatus.AVAILABLE },
          order: [['created_at', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      }

      if (!copy) {
        throw new ConflictError('No available copy for this book');
      }

      const activeLoan = await Loan.findOne({
        where: { copyId: copy.id, status: LoanStatus.ACTIVE },
        transaction,
      });

      if (activeLoan) {
        throw new ConflictError('This copy is already on loan');
      }

      const loanedAt = new Date();
      const dueDate = new Date(loanedAt.getTime() + env.MAX_LOAN_DAYS * 24 * 60 * 60 * 1000);

      copy.status = BookCopyStatus.BORROWED;
      await copy.save({ transaction });

      await Loan.create(
        {
          userId: entry.userId,
          copyId: copy.id,
          loanedAt,
          dueDate,
          status: LoanStatus.ACTIVE,
        },
        { transaction }
      );

      entry.status = QueueStatus.FULFILLED;
      await entry.save({ transaction });

      await transaction.commit();
      return entry;
    } catch (error) {
      if (!(transaction as { finished?: string }).finished) {
        await transaction.rollback();
      }
      throw error;
    } finally {
      if (bookId) {
        await bookService.recalculateCopyCounts(bookId);
      }
    }
  }

  /** Expire old queue entries */
  async expireQueueEntries(): Promise<number> {
    const result = await QueueEntry.update(
      { status: QueueStatus.EXPIRED },
      {
        where: {
          status: QueueStatus.NOTIFIED,
          expiresAt: { [Op.lt]: new Date() },
        },
      }
    );

    // Recalculate positions after expiry
    const expiredBooks = await QueueEntry.findAll({
      where: { status: QueueStatus.EXPIRED },
      attributes: ['bookId'],
      group: ['bookId'],
    });

    for (const entry of expiredBooks) {
      await this.recalculatePositions(entry.bookId);
    }

    return result[0];
  }

  /** Recalculate positions after removal/expiry */
  private async recalculatePositions(bookId: string): Promise<void> {
    const waitingEntries = await QueueEntry.findAll({
      where: {
        bookId,
        status: QueueStatus.WAITING,
      },
      order: [['position', 'ASC']],
    });

    for (let i = 0; i < waitingEntries.length; i++) {
      if (waitingEntries[i].position !== i + 1) {
        waitingEntries[i].position = i + 1;
        await waitingEntries[i].save();
      }
    }
  }
}

export const queueService = new QueueService();