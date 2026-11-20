import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '@/config/database';
import { User } from '@/modules/users/user.model';

export interface IRefreshTokenAttributes {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

interface IRefreshTokenCreationAttributes extends Optional<IRefreshTokenAttributes, 'id' | 'createdAt' | 'revokedAt'> {}

export class RefreshToken extends Model<IRefreshTokenAttributes, IRefreshTokenCreationAttributes> implements IRefreshTokenAttributes {
  // Associations
  public readonly user?: User;
}

RefreshToken.init(
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
    token: {
      type: DataTypes.STRING(500),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at',
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    modelName: 'RefreshToken',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['token'], unique: true },
      { fields: ['expires_at'] },
    ],
  }
);

// Associations
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });