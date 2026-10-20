import { Request, Response } from 'express';
import {
  clearCsrfCookie,
  CSRF_COOKIE_NAME,
  setCsrfCookie,
} from '../../middlewares/csrf.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from '../../utils/jwt';
import { LoginInput, RegisterInput, UpdateProfileInput } from './auth.schemas';
import { authService } from './auth.service';

export class AuthController {
  public getCsrfToken = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const csrfToken = setCsrfCookie(res);
    res.status(200).json({
      success: true,
      data: { csrfToken },
    });
  });

  public register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RegisterInput;
    const user = await authService.register(body);

    setAuthCookies(res, user);
    const csrfToken = setCsrfCookie(res);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user,
        csrfToken,
      },
    });
  });

  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginInput;
    const user = await authService.login(body);

    setAuthCookies(res, user);
    const csrfToken = setCsrfCookie(res);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user,
        csrfToken,
      },
    });
  });

  public logout = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    clearAuthCookies(res);
    clearCsrfCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  });

  public refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const user = await authService.refreshSession(refreshToken);

    setAuthCookies(res, user);
    const csrfToken = setCsrfCookie(res);

    res.status(200).json({
      success: true,
      message: 'Session refreshed.',
      data: {
        user,
        csrfToken,
      },
    });
  });

  public getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = await authService.getProfile(req.user!.id);
    const existingCsrf = req.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const csrfToken = existingCsrf ?? setCsrfCookie(res);

    res.status(200).json({
      success: true,
      data: {
        user,
        csrfToken,
      },
    });
  });

  public updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateProfileInput;
    const user = await authService.updateProfile(req.user!.id, body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: { user },
    });
  });
}

export const authController = new AuthController();
