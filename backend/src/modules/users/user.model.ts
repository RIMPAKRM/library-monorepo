import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';

// User Role Enum
export enum UserRole {
  READER = 'READER',
  LIBRARIAN = 'LIBRARIAN',
  MODERATOR = 'MODERATOR',
}

// User Attributes
export interface IUserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserCreationAttributes extends Optional<IUserAttributes, 'id' | 'createdAt' | 'updatedAt' | 'role'> {}

export class User extends Model<IUserAttributes, IUserCreationAttributes> implements IUserAttributes {
  // Instance methods
  public toSafeObject(): Omit<IUserAttributes, 'passwordHash'> {
    const { passwordHash, ...safe } = this.toJSON();
    return safe;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'last_name',
    },
    role: {
      type: DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.READER,
    },
  },
  {
    sequelize,
    tableName: 'users',
    modelName: 'User',
  }
);