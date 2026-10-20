import crypto from 'crypto';
import { CookieOptions, NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const CSRF_COOKIE_NAME = 'shopsphere_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

function signNonce(nonce: string): string {
  return crypto.createHmac('sha256', env.CSRF_SECRET).update(nonce).digest('hex');
}

export function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  const signature = signNonce(nonce);
  return `${nonce}.${signature}`;
}

export function verifyCsrfTokenSignature(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [nonce, providedSignature] = parts;
  if (!nonce || !providedSignature) return false;

  const expectedSignature = signNonce(nonce);
  const providedBuf = Buffer.from(providedSignature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export function setCsrfCookie(res: Response): string {
  const token = generateCsrfToken();
  const options: CookieOptions = {
    httpOnly: false, // Readable by same-origin SPA JS to attach in X-CSRF-Token header
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie(CSRF_COOKIE_NAME, token, options);
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const requireCsrf = (req: Request, _res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    next(
      new AppError(
        'Missing CSRF token cookie or X-CSRF-Token header',
        403,
        'CSRF_TOKEN_MISSING'
      )
    );
    return;
  }

  const cookieBuf = Buffer.from(cookieToken, 'utf8');
  const headerBuf = Buffer.from(headerToken, 'utf8');

  if (
    cookieBuf.length !== headerBuf.length ||
    !crypto.timingSafeEqual(cookieBuf, headerBuf) ||
    !verifyCsrfTokenSignature(headerToken)
  ) {
    next(new AppError('Invalid CSRF token', 403, 'CSRF_TOKEN_INVALID'));
    return;
  }

  next();
};

export const requireCsrfProtection = requireCsrf;

