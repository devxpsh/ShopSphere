import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiClientError } from '../api/client';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError('Unable to sign in. Please try again.');
      }
    }
  };

  const fillDemoCredentials = (role: 'customer' | 'admin') => {
    if (role === 'customer') {
      setValue('email', 'aarav.sharma@example.in');
      setValue('password', 'CustomerPassword123!');
    } else {
      setValue('email', 'admin@shopsphere.in');
      setValue('password', 'AdminPassword123!');
    }
    setServerError(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="mx-auto h-11 w-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-2">
            <LogIn className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sign in to ShopSphere
          </h1>
          <p className="text-xs text-slate-500">
            Protected by HttpOnly JWT cookies &amp; HMAC CSRF verification
          </p>
        </div>

        {/* Dev-Only Demo Credential Quick Fill */}
        {import.meta.env.DEV && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>Development Demo Accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('customer')}
                className="rounded-lg bg-white border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                Fill Demo Customer
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin')}
                className="rounded-lg bg-white border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
              >
                Fill Demo Admin
              </button>
            </div>
          </div>
        )}

        {serverError && (
          <div
            role="alert"
            className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              placeholder="you@example.in"
              className="input-field"
            />
            {errors.email && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              placeholder="••••••••"
              className="input-field"
            />
            {errors.password && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full !py-2.5"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600">
          New to ShopSphere?{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-600 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};
