import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '@/modules/users/user.model';
import { RefreshToken } from '@/modules/auth/refreshToken.model';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, IJWTPayload } from '@/config/jwt';
import { env } from '@/config/env';
import { UnauthorizedError, ConflictError, NotFoundError } from '@/shared/exceptions/AppError';

export interface IRegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ILoginData {
  email: string;
  password: string;
}

export interface IAuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly SALT_ROUNDS = 12;

  /** Register new user */
  async register(data: IRegisterData): Promise<IAuthResult> {
    // Check if user exists
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: UserRole.READER,
    });

    // Generate tokens
    const payload: IJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token
    await this.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  /** Login user */
  async login(data: ILoginData): Promise<IAuthResult> {
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: IJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await this.storeRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  /** Refresh access token */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    let payload: IJWTPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists and not revoked
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken, revokedAt: null },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    // Get user to verify still exists
    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Generate new access token
    const newPayload: IJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return generateAccessToken(newPayload);
  }

  /** Rotate refresh token (issue new one, revoke old) */
  async rotateRefreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: IJWTPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken, revokedAt: null },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    const user = await User.findByPk(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Revoke old token
    await storedToken.update({ revokedAt: new Date() });

    // Generate new tokens
    const newPayload: IJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    await this.storeRefreshToken(user.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Logout - revoke refresh token */
  async logout(refreshToken: string): Promise<void> {
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken },
    });

    if (storedToken) {
      await storedToken.update({ revokedAt: new Date() });
    }
  }

  /** Logout all devices */
  async logoutAll(userId: string): Promise<void> {
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: null } }
    );
  }

  /** Get user profile */
  async getProfile(userId: string): Promise<User> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  }

  /** Store refresh token in database */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    // Calculate expiry from JWT_REFRESH_EXPIRES (e.g., "7d")
    const expiresIn = this.parseExpiry(env.JWT_REFRESH_EXPIRES);
    const expiresAt = new Date(Date.now() + expiresIn);

    await RefreshToken.create({
      userId,
      token,
      expiresAt,
    });
  }

  /** Parse expiry string like "7d", "15m" to milliseconds */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }
}

export const authService = new AuthService();