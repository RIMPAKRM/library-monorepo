import { Loan } from '@/modules/loans/loan.model';
import { LoanStatus } from '@/modules/loans/loan.model';
import { BookCopy } from '@/modules/copies/copy.model';
import { BookCopyStatus } from '@/modules/copies/copy.model';
import { QueueEntry } from '@/modules/queue/queue.model';
import { QueueStatus } from '@/modules/queue/queue.model';
import { Book } from '@/modules/books/book.model';
import { bookService } from '@/modules/books/book.service';
import { User } from '@/modules/users/user.model';
import { sequelize } from '@/config/database';
import { NotFoundError, ConflictError } from '@/shared/exceptions/AppError';
import { IPaginatedResponse, IQueryParams } from '@/modules/shared/types';
import { Op, Transaction } from 'sequelize';
import { env } from '@/config/env';

const normalizeSortField = (field: string): string => {
  // Convert camelCase to snake_case for Sequelize underscored models
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export interface ICreateLoanData {
  copyId: string;
  userId: string;
}

export interface ILoanListParams extends IQueryParams {
  userId?: string;
  copyId?: string;
  status?: LoanStatus;
  overdue?: boolean;
}

export class LoanService {
  /** Create a loan (borrow a book) */
  async createLoan(data: ICreateLoanData): Promise<{ loan: Loan; message: string }> {
    const transaction: Transaction = await sequelize.transaction();
    let bookId = '';

    try {
      // Verify copy exists and is available
      const copy = await BookCopy.findByPk(data.copyId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!copy) {
        throw new NotFoundError('Copy', data.copyId);
      }

      // Verify user exists
      const user = await User.findByPk(data.userId, { transaction });
      if (!user) {
        throw new NotFoundError('User', data.userId);
      }

      // Check if user already has an active loan for this copy
      const existingActiveLoan = await Loan.findOne({
        where: {
          copyId: data.copyId,
          userId: data.userId,
          status: LoanStatus.ACTIVE,
        },
        transaction,
      });
      if (existingActiveLoan) {
        throw new ConflictError('You already have an active loan for this copy');
      }

      const book = await Book.findByPk(copy.bookId, { transaction });
      if (!book) {
        throw new NotFoundError('Book', copy.bookId);
      }

      bookId = book.id;

      // Calculate due date
      const loanedAt = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + env.MAX_LOAN_DAYS);

      let message = '';

      if (copy.status === BookCopyStatus.AVAILABLE) {
        // Copy is available - issue immediately
        copy.status = BookCopyStatus.BORROWED;
        await copy.save({ transaction });

        const loan = await Loan.create({
          userId: data.userId,
          copyId: data.copyId,
          loanedAt,
          dueDate,
          status: LoanStatus.ACTIVE,
        }, { transaction });

        message = 'Book borrowed successfully';

        await transaction.commit();
        return { loan: await this.loadLoanWithRelations(loan.id), message };
      } else {
        // Copy not available - add to queue
        // Check if user already in queue for this book
        const existingQueue = await QueueEntry.findOne({
          where: {
            userId: data.userId,
            bookId: book.id,
            status: { [Op.in]: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
          },
          transaction,
        });
        if (existingQueue) {
          throw new ConflictError('You are already in the queue for this book');
        }

        // Get next queue position
        const lastQueueEntry = await QueueEntry.findOne({
          where: {
            bookId: book.id,
            status: { [Op.in]: [QueueStatus.WAITING, QueueStatus.NOTIFIED] },
          },
          order: [['position', 'DESC']],
          transaction,
        });

        const position = lastQueueEntry ? lastQueueEntry.position + 1 : 1;

        const queueEntry = await QueueEntry.create({
          userId: data.userId,
          bookId: book.id,
          position,
          status: QueueStatus.WAITING,
          expiresAt: new Date(Date.now() + env.RESERVATION_HOURS * 60 * 60 * 1000),
        }, { transaction });

        await transaction.commit();

        return {
          loan: queueEntry as unknown as Loan,
          message: `No available copies. You are #${position} in the queue for "${book.title}"`,
        };
      }
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

  /** Return a book */
  async returnLoan(loanId: string, userId?: string): Promise<{ loan: Loan; message: string }> {
    const transaction: Transaction = await sequelize.transaction();
    let bookId = '';

    try {
      const loan = await Loan.findByPk(loanId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!loan) {
        throw new NotFoundError('Loan', loanId);
      }

      // Check ownership if userId provided
      if (userId && loan.userId !== userId) {
        const user = await User.findByPk(userId);
        if (!user || user.role !== 'MODERATOR') {
          throw new ConflictError('You can only return your own loans');
        }
      }

      if (loan.status !== LoanStatus.ACTIVE) {
        throw new ConflictError(`Loan is already ${loan.status}`);
      }

      const now = new Date();
      loan.returnedAt = now;
      loan.status = LoanStatus.RETURNED;
      await loan.save({ transaction });

      // NB: association properties declared on the model class shadow
      // Sequelize getters, so load the copy explicitly.
      const copy = await BookCopy.findByPk(loan.copyId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!copy) {
        throw new NotFoundError('Book copy');
      }

      bookId = copy.bookId;

      const book = await Book.findByPk(copy.bookId, { transaction });
      if (!book) {
        throw new NotFoundError('Book');
      }

      // Find next person in queue for this book
      const nextInQueue = await QueueEntry.findOne({
        where: {
          bookId: book.id,
          status: QueueStatus.WAITING,
        },
        order: [['position', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      let message: string;

      if (nextInQueue) {
        // Reserve copy for next person in queue
        copy.status = BookCopyStatus.RESERVED;
        await copy.save({ transaction });

        nextInQueue.status = QueueStatus.NOTIFIED;
        nextInQueue.notifiedAt = now;
        nextInQueue.expiresAt = new Date(Date.now() + env.RESERVATION_HOURS * 60 * 60 * 1000);
        await nextInQueue.save({ transaction });

        message = 'Book returned. Copy reserved for next person in queue.';
      } else {
        // No queue - copy becomes available
        copy.status = BookCopyStatus.AVAILABLE;
        await copy.save({ transaction });

        message = 'Book returned successfully. Copy is now available.';
      }

      await transaction.commit();

      return {
        loan: await this.loadLoanWithRelations(loanId),
        message,
      };
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

  /** Get my loans */
  async getMyLoans(userId: string, params: ILoanListParams): Promise<IPaginatedResponse<Loan>> {
    const { page = 1, limit = 20, status, sortBy = 'loanedAt', sortOrder = 'DESC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const { rows, count } = await Loan.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      include: [
        {
          model: BookCopy,
          as: 'copy',
          include: [{ model: Book, as: 'book' }],
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

  /** Get all loans (librarian/moderator) */
  async getLoans(params: ILoanListParams): Promise<IPaginatedResponse<Loan>> {
    const { page = 1, limit = 20, userId, copyId, status, overdue, sortBy = 'loanedAt', sortOrder = 'DESC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = {};
    
    if (userId) where.userId = userId;
    if (copyId) where.copyId = copyId;
    if (status) where.status = status;
    
    if (overdue) {
      where.status = LoanStatus.ACTIVE;
      where.dueDate = { [Op.lt]: new Date() };
    }

    const { rows, count } = await Loan.findAndCountAll({
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
          model: BookCopy,
          as: 'copy',
          include: [{ model: Book, as: 'book' }],
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

  /** Get overdue loans */
  async getOverdueLoans(): Promise<Loan[]> {
    return Loan.findAll({
      where: {
        status: LoanStatus.ACTIVE,
        dueDate: { [Op.lt]: new Date() },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: BookCopy,
          as: 'copy',
          include: [{ model: Book, as: 'book' }],
        },
      ],
      order: [['dueDate', 'ASC']],
    });
  }

  /** Load loan with relations */
  private async loadLoanWithRelations(loanId: string): Promise<Loan> {
    return Loan.findByPk(loanId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        {
          model: BookCopy,
          as: 'copy',
          include: [{ model: Book, as: 'book' }],
        },
      ],
    });
  }
}

export const loanService = new LoanService();