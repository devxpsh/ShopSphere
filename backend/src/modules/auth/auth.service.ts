import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { verifyRefreshToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schemas';

export interface PublicUserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// Pre-computed dummy bcrypt hash to prevent timing attacks when an email doesn't exist
const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export class AuthService {
  public async register(input: RegisterInput): Promise<PublicUserProfile> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(
        'An account with this email address already exists.',
        409,
        'EMAIL_ALREADY_EXISTS'
      );
    }

    const passwordHash = await hashPassword(input.password);

    // Create User (strictly CUSTOMER role) + persistent Cart inside a transaction
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone ?? null,
          role: Role.CUSTOMER, // Never allow client-supplied role
          isActive: true,
        },
        select: publicUserSelect,
      });

      await tx.cart.create({
        data: {
          userId: createdUser.id,
        },
      });

      return createdUser;
    });

    return user;
  }

  public async login(input: LoginInput): Promise<PublicUserProfile> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      await verifyPassword(input.password, DUMMY_PASSWORD_HASH);
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError(
        'Your account has been deactivated. Please contact support.',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    // Ensure the user has a persistent cart
    await prisma.cart.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async refreshSession(refreshToken: string | undefined): Promise<PublicUserProfile> {
    if (!refreshToken) {
      throw new AppError('Refresh token missing. Please log in again.', 401, 'UNAUTHORIZED');
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: publicUserSelect,
    });

    if (!user || !user.isActive) {
      throw new AppError('Account not found or inactive.', 401, 'ACCOUNT_INACTIVE');
    }

    return user;
  }

  public async getProfile(userId: string): Promise<PublicUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  public async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<PublicUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User profile not found.', 404, 'USER_NOT_FOUND');
    }

    let newPasswordHash: string | undefined;
    if (input.newPassword && input.currentPassword) {
      const matches = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!matches) {
        throw new AppError(
          'Current password is incorrect.',
          400,
          'INVALID_CURRENT_PASSWORD'
        );
      }
      newPasswordHash = await hashPassword(input.newPassword);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}),
      },
      select: publicUserSelect,
    });

    return updated;
  }
}

export const authService = new AuthService();
