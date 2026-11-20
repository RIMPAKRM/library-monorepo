import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { User } from '@/modules/users/user.model';
import { Book } from '@/modules/books/book.model';

export enum QueueStatus {
  WAITING = 'WAITING',
  NOTIFIED = 'NOTIFIED',
  EXPIRED = 'EXPIRED',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export interface IQueueEntryAttributes {
  id: string;
  userId: string;
  bookId: string;
  position: number;
  status: QueueStatus;
  notifiedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IQueueEntryCreationAttributes extends Optional<IQueueEntryAttributes, 'id' | 'createdAt' | 'updatedAt' | 'notifiedAt' | 'expiresAt' | 'status'> {}

export class QueueEntry extends Model<IQueueEntryAttributes, IQueueEntryCreationAttributes> implements IQueueEntryAttributes {
  // Associations
  public readonly user?: User;
  public readonly book?: Book;
}

QueueEntry.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    bookId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'book_id',
      references: { model: 'books', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(QueueStatus)),
      allowNull: false,
      defaultValue: QueueStatus.WAITING,
    },
    notifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'notified_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
  },
  {
    sequelize,
    tableName: 'queue',
    modelName: 'QueueEntry',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['book_id'] },
      { fields: ['status'] },
      { fields: ['book_id', 'status', 'position'] },
      { fields: ['user_id', 'book_id'], unique: true, where: { status: ['WAITING', 'NOTIFIED'] } },
    ],
  }
);

// Associations
QueueEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });
QueueEntry.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
User.hasMany(QueueEntry, { foreignKey: 'userId', as: 'queueEntries' });
Book.hasMany(QueueEntry, { foreignKey: 'bookId', as: 'queueEntries' });