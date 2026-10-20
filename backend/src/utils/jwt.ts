import { Role } from '@prisma/client';
import { CookieOptions, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './AppError';

export const ACCESS_TOKEN_COOKIE = 'shopsphere_access_token';
export const REFRESH_TOKEN_COOKIE = 'shopsphere_refresh_token';

export interface JwtUserPayload {
  sub: string;
  email: string;
  role: Role;
  type: 'access' | 'refresh';
}

export function signAccessToken(user: { id: string; email: string; role: Role }): string {
  const payload: JwtUserPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(user: { id: string; email: string; role: Role }): string {
  const payload: JwtUserPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtUserPayload;
    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN');
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED');
  }
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtUserPayload;
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token type', 401, 'INVALID_REFRESH_TOKEN');
    }
    return decoded;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
}

export function getBaseCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAuthCookies(
  res: Response,
  user: { id: string; email: string; role: Role }
): { accessToken: string; refreshToken: string } {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // 15 minutes for access token cookie
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, getBaseCookieOptions(15 * 60 * 1000));
  // 7 days for refresh token cookie
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    getBaseCookieOptions(7 * 24 * 60 * 60 * 1000)
  );

  return { accessToken, refreshToken };
}

export function clearAuthCookies(res: Response): void {
  const clearOptions: CookieOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, clearOptions);
}
