import { apiRequest, setCsrfToken } from './client';
import type { User } from '../types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export interface AuthResponseData {
  user: User;
  csrfToken: string;
}

export const authApi = {
  async fetchCsrfToken(): Promise<string> {
    const res = await apiRequest<{ csrfToken: string }>('/auth/csrf');
    setCsrfToken(res.data.csrfToken);
    return res.data.csrfToken;
  },

  async getMe(): Promise<User> {
    const res = await apiRequest<{ user: User }>('/auth/me');
    return res.data.user;
  },

  async login(input: LoginInput): Promise<User> {
    const res = await apiRequest<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: input,
    });
    setCsrfToken(res.data.csrfToken);
    return res.data.user;
  },

  async register(input: RegisterInput): Promise<User> {
    const res = await apiRequest<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: input,
    });
    setCsrfToken(res.data.csrfToken);
    return res.data.user;
  },

  async logout(): Promise<void> {
    await apiRequest<null>('/auth/logout', {
      method: 'POST',
    });
    setCsrfToken(null);
  },

  async updateProfile(input: { fullName?: string; phone?: string | null }): Promise<User> {
    const res = await apiRequest<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: input,
    });
    return res.data.user;
  },
};

