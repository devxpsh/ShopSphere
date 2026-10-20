import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  MapPin,
  Package,
  Heart,
  Shield,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../api/client';

export const ProfilePage: React.FC = () => {
  const { user, isLoading, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || '');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to view your profile
        </h1>
        <Link to="/login" className="btn-primary">
          Sign In
        </Link>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);
    try {
      await authApi.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() ? phone.trim() : null,
      });
      await refreshUser();
      setFeedback({
        type: 'success',
        message: 'Account profile updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          My Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Manage your personal details, saved Indian addresses, and order
          history
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/orders"
          className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-brand-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">My Orders</h2>
              <p className="text-xs text-slate-500">
                Track packages & invoices
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          to="/addresses"
          className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-brand-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Saved Addresses
              </h2>
              <p className="text-xs text-slate-500">
                Manage PIN codes & delivery
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          to="/wishlist"
          className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-brand-400 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Wishlist</h2>
              <p className="text-xs text-slate-500">Saved items for later</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>
      </div>

      {/* Personal Information Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-brand-600" />
            <h2 className="text-base font-bold text-slate-900">
              Personal Profile
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-700">
            <Shield className="h-3 w-3 text-brand-600" />
            Role: {user.role}
          </span>
        </div>

        {feedback && (
          <div
            role="status"
            className={`rounded-xl border p-3 text-xs flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="prof-email"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Email Address (Verified)
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={user.email}
              className="input-field !text-xs bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="prof-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Full Name *
            </label>
            <input
              id="prof-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field !text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="prof-phone"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              10-Digit Indian Mobile Number
            </label>
            <input
              id="prof-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="9876543210"
              className="input-field !text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary !py-2.5 !px-5 !text-xs"
          >
            {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
