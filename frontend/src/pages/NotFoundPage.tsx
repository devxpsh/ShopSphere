import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ShoppingBag } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
        <Compass className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
          Error 404
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
          Page Not Found
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          The page you requested does not exist or may have been moved. Explore
          our live product catalog or return to the home page.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link to="/" className="btn-primary">
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
        <Link to="/products" className="btn-secondary">
          <ShoppingBag className="h-4 w-4" />
          Browse Products
        </Link>
      </div>
    </div>
  );
};
