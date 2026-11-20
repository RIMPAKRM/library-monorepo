import { BookCopy } from '@/modules/copies/copy.model';
import { BookCopyStatus } from '@/modules/copies/copy.model';
import { Book } from '@/modules/books/book.model';
import { bookService } from '@/modules/books/book.service';
import { NotFoundError, ConflictError } from '@/shared/exceptions/AppError';
import { IPaginatedResponse, IQueryParams } from '@/modules/shared/types';
import { Op } from 'sequelize';

const normalizeSortField = (field: string): string => {
  // Convert camelCase to snake_case for Sequelize underscored models
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

export interface ICreateCopyData {
  bookId: string;
  inventoryNumber: string;
  status?: BookCopyStatus;
}

export interface IUpdateCopyData {
  inventoryNumber?: string;
  status?: BookCopyStatus;
}

export interface ICopyListParams extends IQueryParams {
  bookId?: string;
  status?: BookCopyStatus;
}

export class CopyService {
  /** Get paginated copies list */
  async getCopies(params: ICopyListParams): Promise<IPaginatedResponse<BookCopy>> {
    const { page = 1, limit = 20, bookId, status, sortBy = 'createdAt', sortOrder = 'ASC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = {};
    
    if (bookId) {
      where.bookId = bookId;
    }
    
    if (status) {
      where.status = status;
    }

    const { rows, count } = await BookCopy.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      include: [
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

  /** Get copy by ID */
  async getCopyById(id: string): Promise<BookCopy> {
    const copy = await BookCopy.findByPk(id, {
      include: [
        {
          model: Book,
          as: 'book',
        },
      ],
    });
    
    if (!copy) {
      throw new NotFoundError('Copy', id);
    }
    
    return copy;
  }

  /** Create copy */
  async createCopy(data: ICreateCopyData): Promise<BookCopy> {
    // Check inventory number uniqueness
    const existing = await BookCopy.findOne({ where: { inventoryNumber: data.inventoryNumber } });
    if (existing) {
      throw new ConflictError('Copy with this inventory number already exists');
    }

    // Verify book exists
    const book = await Book.findByPk(data.bookId);
    if (!book) {
      throw new NotFoundError('Book', data.bookId);
    }

    const copy = await BookCopy.create({
      bookId: data.bookId,
      inventoryNumber: data.inventoryNumber,
      status: data.status || BookCopyStatus.AVAILABLE,
    });

    await bookService.recalculateCopyCounts(data.bookId);

    return copy;
  }

  /** Update copy */
  async updateCopy(id: string, data: IUpdateCopyData): Promise<BookCopy> {
    const copy = await BookCopy.findByPk(id);
    
    if (!copy) {
      throw new NotFoundError('Copy', id);
    }

    // Check inventory number uniqueness if changing
    if (data.inventoryNumber && data.inventoryNumber !== copy.inventoryNumber) {
      const existing = await BookCopy.findOne({ where: { inventoryNumber: data.inventoryNumber } });
      if (existing) {
        throw new ConflictError('Copy with this inventory number already exists');
      }
    }

    await copy.update(data);
    await bookService.recalculateCopyCounts(copy.bookId);
    return copy;
  }

  /** Delete copy */
  async deleteCopy(id: string): Promise<void> {
    const copy = await BookCopy.findByPk(id);
    
    if (!copy) {
      throw new NotFoundError('Copy', id);
    }

    const { bookId } = copy;
    await copy.destroy();
    await bookService.recalculateCopyCounts(bookId);
  }

  /** Get copies by book ID */
  async getCopiesByBook(bookId: string): Promise<BookCopy[]> {
    return BookCopy.findAll({
      where: { bookId },
      order: [['createdAt', 'ASC']],
    });
  }
}

export const copyService = new CopyService();