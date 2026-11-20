import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { Book } from '@/modules/books/book.model';

export enum BookCopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  RESERVED = 'RESERVED',
  LOST = 'LOST',
}

export interface IBookCopyAttributes {
  id: string;
  bookId: string;
  inventoryNumber: string;
  status: BookCopyStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface IBookCopyCreationAttributes extends Optional<IBookCopyAttributes, 'id' | 'createdAt' | 'updatedAt' | 'status'> {}

export class BookCopy extends Model<IBookCopyAttributes, IBookCopyCreationAttributes> implements IBookCopyAttributes {
  // Associations
  public readonly book?: Book;
}

BookCopy.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'book_id',
      references: { model: 'books', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    inventoryNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'inventory_number',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(BookCopyStatus)),
      allowNull: false,
      defaultValue: BookCopyStatus.AVAILABLE,
    },
  },
  {
    sequelize,
    tableName: 'book_copies',
    modelName: 'BookCopy',
    indexes: [
      { fields: ['book_id'] },
      { fields: ['status'] },
      { fields: ['inventory_number'], unique: true },
    ],
  }
);

// Associations
BookCopy.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
Book.hasMany(BookCopy, { foreignKey: 'bookId', as: 'copies' });