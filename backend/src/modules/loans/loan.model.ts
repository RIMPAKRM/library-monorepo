import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { User } from '@/modules/users/user.model';
import { BookCopy } from '@/modules/copies/copy.model';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  LOST = 'LOST',
}

export interface ILoanAttributes {
  id: string;
  userId: string;
  copyId: string;
  loanedAt: Date;
  dueDate: Date;
  returnedAt?: Date;
  status: LoanStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface ILoanCreationAttributes extends Optional<ILoanAttributes, 'id' | 'createdAt' | 'updatedAt' | 'returnedAt' | 'status'> {}

export class Loan extends Model<ILoanAttributes, ILoanCreationAttributes> implements ILoanAttributes {
  // Associations
  public readonly user?: User;
  public readonly copy?: BookCopy;
}

Loan.init(
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
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    copyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'copy_id',
      references: { model: 'book_copies', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    },
    loanedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'loaned_at',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'due_date',
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'returned_at',
    },
    status: {
      type: DataTypes.ENUM(...Object.values(LoanStatus)),
      allowNull: false,
      defaultValue: LoanStatus.ACTIVE,
    },
  },
  {
    sequelize,
    tableName: 'loans',
    modelName: 'Loan',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['copy_id'] },
      { fields: ['status'] },
      { fields: ['due_date'] },
    ],
  }
);

// Associations
Loan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Loan.belongsTo(BookCopy, { foreignKey: 'copyId', as: 'copy' });
User.hasMany(Loan, { foreignKey: 'userId', as: 'loans' });
BookCopy.hasMany(Loan, { foreignKey: 'copyId', as: 'loans' });