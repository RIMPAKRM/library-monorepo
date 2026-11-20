import { Book } from '@/modules/books/book.model';
import { BookCopy } from '@/modules/copies/copy.model';
import { BookCopyStatus } from '@/modules/copies/copy.model';
import { Loan } from '@/modules/loans/loan.model';
import { QueueEntry } from '@/modules/queue/queue.model';
import { NotFoundError, ConflictError } from '@/shared/exceptions/AppError';
import { IPaginatedResponse, IQueryParams } from '@/modules/shared/types';
import { sequelize } from '@/config/database';
import { Op, Transaction } from 'sequelize';

export interface ICreateBookData {
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  copiesCount?: number;
}

export interface IUpdateBookData {
  title?: string;
  author?: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
}

const normalizeSortField = (field: string): string => {
  // Convert camelCase to snake_case for Sequelize underscored models
  return field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export interface IBookListParams extends IQueryParams {
  search?: string;
  author?: string;
}

export class BookService {
  /** Get paginated books list */
  async getBooks(params: IBookListParams): Promise<IPaginatedResponse<Book>> {
    const { page = 1, limit = 20, search, author, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { author: { [Op.iLike]: `%${search}%` } },
        { isbn: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    if (author) {
      where.author = { [Op.iLike]: `%${author}%` };
    }

    const { rows, count } = await Book.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      include: [
        {
          model: BookCopy,
          as: 'copies',
          attributes: ['id', 'status', 'inventoryNumber'],
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

  /** Get book by ID with copies */
  async getBookById(id: string): Promise<Book> {
    const book = await Book.findByPk(id, {
      include: [
        {
          model: BookCopy,
          as: 'copies',
        },
      ],
    });
    
    if (!book) {
      throw new NotFoundError('Book', id);
    }
    
    return book;
  }

  /** Create new book (optionally with initial copies) */
  async createBook(data: ICreateBookData): Promise<Book> {
    // Check ISBN uniqueness if provided
    if (data.isbn) {
      const existing = await Book.findOne({ where: { isbn: data.isbn } });
      if (existing) {
        throw new ConflictError('Book with this ISBN already exists');
      }
    }

    const copiesCount = Math.max(0, data.copiesCount || 0);
    const transaction: Transaction = await sequelize.transaction();

    try {
      const book = await Book.create(
        {
          title: data.title,
          author: data.author,
          isbn: data.isbn,
          description: data.description,
          coverUrl: data.coverUrl,
          copiesCount,
          availableCopiesCount: copiesCount,
        },
        { transaction }
      );

      if (copiesCount > 0) {
        const inventoryNumbers = await this.generateInventoryNumbers(copiesCount, transaction);

        await BookCopy.bulkCreate(
          inventoryNumbers.map((inventoryNumber) => ({
            bookId: book.id,
            inventoryNumber,
            status: BookCopyStatus.AVAILABLE,
          })),
          { transaction }
        );
      }

      await transaction.commit();

      return this.getBookById(book.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /** Update book */
  async updateBook(id: string, data: IUpdateBookData): Promise<Book> {
    const book = await Book.findByPk(id);
    
    if (!book) {
      throw new NotFoundError('Book', id);
    }

    // Check ISBN uniqueness if changing
    if (data.isbn && data.isbn !== book.isbn) {
      const existing = await Book.findOne({ where: { isbn: data.isbn } });
      if (existing) {
        throw new ConflictError('Book with this ISBN already exists');
      }
    }

    await book.update(data);
    return book;
  }

  /** Delete book with its copies, queue entries and loan history */
  async deleteBook(id: string): Promise<void> {
    const book = await Book.findByPk(id);
    
    if (!book) {
      throw new NotFoundError('Book', id);
    }

    const transaction: Transaction = await sequelize.transaction();

    try {
      const copies = await BookCopy.findAll({
        where: { bookId: id },
        attributes: ['id'],
        transaction,
      });
      const copyIds = copies.map((copy) => copy.id);

      if (copyIds.length > 0) {
        // loans reference copies with ON DELETE RESTRICT, so remove history first
        await Loan.destroy({
          where: { copyId: { [Op.in]: copyIds } },
          transaction,
        });
      }

      await QueueEntry.destroy({ where: { bookId: id }, transaction });
      await BookCopy.destroy({ where: { bookId: id }, transaction });
      await book.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      if (!(transaction as { finished?: string }).finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /** Get available copies count for a book */
  async getAvailableCopies(bookId: string): Promise<number> {
    const count = await BookCopy.count({
      where: { bookId, status: BookCopyStatus.AVAILABLE },
    });
    return count;
  }

  /** Recalculate stored counters for a book based on its copies */
  async recalculateCopyCounts(bookId: string): Promise<void> {
    const book = await Book.findByPk(bookId);
    if (!book) {
      return;
    }

    const copiesCount = await BookCopy.count({ where: { bookId } });
    const availableCopiesCount = await BookCopy.count({
      where: { bookId, status: BookCopyStatus.AVAILABLE },
    });

    if (book.copiesCount !== copiesCount || book.availableCopiesCount !== availableCopiesCount) {
      await book.update({ copiesCount, availableCopiesCount });
    }
  }

  /**
   * Generate sequential inventory numbers like INV-007.
   * Falls back to a timestamp suffix when no numeric numbers exist.
   */
  private async generateInventoryNumbers(count: number, transaction?: Transaction): Promise<string[]> {
    const existing = await BookCopy.findAll({
      attributes: ['inventoryNumber'],
      transaction,
    });

    let maxNumber = 0;
    for (const copy of existing) {
      const match = /^INV-(\d+)$/.exec(copy.inventoryNumber);
      if (match) {
        maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
      }
    }

    const numbers: string[] = [];
    for (let i = 1; i <= count; i += 1) {
      const candidate = `INV-${String(maxNumber + i).padStart(3, '0')}`;
      numbers.push(candidate);
    }

    return numbers;
  }
}

export const bookService = new BookService();