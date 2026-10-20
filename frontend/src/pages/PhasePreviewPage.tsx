import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PhasePreviewPageProps {
  title: string;
  phaseLabel: string;
  description: string;
}

export const PhasePreviewPage: React.FC<PhasePreviewPageProps> = ({
  title,
  phaseLabel,
  description,
}) => {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-200">
        <Layers className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
          Scheduled for {phaseLabel}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {title}
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          {description}
        </p>
      </div>

      {isAuthenticated && user && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 max-w-md mx-auto text-left flex items-center gap-3 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-slate-900">
              Signed in as {user.fullName} ({user.role})
            </p>
            <p className="text-slate-500">{user.email}</p>
          </div>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center gap-3">
        <Link to="/products" className="btn-primary">
          <ArrowLeft className="h-4 w-4" />
          Explore Product Catalog
        </Link>
        <Link to="/" className="btn-secondary">
          Return Home
        </Link>
      </div>
    </div>
  );
};
