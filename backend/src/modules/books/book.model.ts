import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

export interface IBookAttributes {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  description?: string;
  coverUrl?: string;
  copiesCount: number;
  availableCopiesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IBookCreationAttributes extends Optional<IBookAttributes, 'id' | 'createdAt' | 'updatedAt' | 'copiesCount' | 'availableCopiesCount' | 'isbn' | 'description' | 'coverUrl'> {}

export class Book extends Model<IBookAttributes, IBookCreationAttributes> implements IBookAttributes {
}

Book.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    isbn: {
      type: DataTypes.STRING(17),
      allowNull: true,
      unique: true,
      validate: { len: [10, 17] },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverUrl: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'cover_url',
    },
    copiesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'copies_count',
    },
    availableCopiesCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'available_copies_count',
    },
  },
  {
    sequelize,
    tableName: 'books',
    modelName: 'Book',
    indexes: [
      { fields: ['title'] },
      { fields: ['author'] },
      { fields: ['isbn'], unique: true },
    ],
  }
);