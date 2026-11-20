import { User, UserRole } from '@/modules/users/user.model';
import { Op } from 'sequelize';
import { NotFoundError, ForbiddenError } from '@/shared/exceptions/AppError';
import { IPaginatedResponse, IQueryParams } from '@/modules/shared/types';

const normalizeSortField = (field: string): string => {
  // Convert camelCase to snake_case for Sequelize underscored models
  return field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export interface IUserListParams extends IQueryParams {
  role?: UserRole;
  search?: string;
}

export interface IUpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
}

export class UserService {
  /** Get paginated users list */
  async getUsers(params: IUserListParams): Promise<IPaginatedResponse<User>> {
    const { page = 1, limit = 20, search, role, sortBy = 'createdAt', sortOrder = 'DESC' } = params;
    const normalizedSortBy = normalizeSortField(sortBy);
    const offset = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    if (role) {
      where.role = role;
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      limit,
      offset,
      order: [[normalizedSortBy, sortOrder]],
      attributes: { exclude: ['passwordHash'] },
    });

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /** Get user by ID */
  async getUserById(id: string): Promise<User> {
    const user = await User.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
    });
    
    if (!user) {
      throw new NotFoundError('User', id);
    }
    
    return user;
  }

  /** Update user */
  async updateUser(id: string, data: IUpdateUserData, requesterRole: UserRole): Promise<User> {
    const user = await User.findByPk(id);
    
    if (!user) {
      throw new NotFoundError('User', id);
    }

    // Only moderators can change roles
    if (data.role && data.role !== user.role && requesterRole !== UserRole.MODERATOR) {
      throw new ForbiddenError('Only moderators can change user roles');
    }

    // Prevent self-demotion for moderators
    if (data.role && user.id === id && user.role === UserRole.MODERATOR && data.role !== UserRole.MODERATOR) {
      throw new ForbiddenError('Cannot change your own moderator role');
    }

    await user.update(data);
    return user;
  }

  /** Delete user (moderator only) */
  async deleteUser(id: string, requesterId: string): Promise<void> {
    const user = await User.findByPk(id);
    
    if (!user) {
      throw new NotFoundError('User', id);
    }

    if (user.id === requesterId) {
      throw new ForbiddenError('Cannot delete yourself');
    }

    await user.destroy();
  }
}

export const userService = new UserService();