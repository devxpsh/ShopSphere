import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  IndianRupee,
  Code2,
} from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      {/* Value Proposition Strip */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-brand-400 shrink-0">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Exact Paise Accounting
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All amounts stored as integer paise (`₹1 = 100p`) to eliminate
                floating-point rounding bugs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-emerald-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Server-Verified Checkout
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                HttpOnly JWT cookies, HMAC CSRF protection, and server-side
                price & stock recalculation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Pan-India PIN Coverage
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports standard 6-digit Indian PIN codes, 18% GST tax
                breakdown, and free delivery above ₹499.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-sky-400 shrink-0">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Real Database Records
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero fabricated metrics. Every product, category, and stock
                count is served live from PostgreSQL 16.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-white font-bold text-xl tracking-tight"
          >
            <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span>
              ShopSphere<span className="text-brand-400">.in</span>
            </span>
          </Link>
          <p className="text-xs text-slate-400 leading-relaxed">
            ShopSphere is a full-stack Indian e-commerce engineering project
            built with React, TypeScript, Express, Prisma ORM, and PostgreSQL.
          </p>
          <div className="pt-1">
            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 border border-amber-500/20">
              [DEMO] Educational & Portfolio Storefront
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
            Categories
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link
                to="/products?category=electronics"
                className="hover:text-white transition-colors"
              >
                Electronics & Audio
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=mens-fashion"
                className="hover:text-white transition-colors"
              >
                Men&apos;s Fashion
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=womens-fashion"
                className="hover:text-white transition-colors"
              >
                Women&apos;s Ethnic & Western
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=home-kitchen"
                className="hover:text-white transition-colors"
              >
                Home & Kitchen Appliances
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=books-stationery"
                className="hover:text-white transition-colors"
              >
                Engineering & Exam Books
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=fitness-sports"
                className="hover:text-white transition-colors"
              >
                Fitness & Sports
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
            Quick Navigation
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link
                to="/products"
                className="hover:text-white transition-colors"
              >
                Full Product Catalog
              </Link>
            </li>
            <li>
              <Link
                to="/products?featured=true"
                className="hover:text-white transition-colors"
              >
                Featured Selections
              </Link>
            </li>
            <li>
              <Link
                to="/products?inStock=true"
                className="hover:text-white transition-colors"
              >
                In-Stock Ready to Ship
              </Link>
            </li>
            <li>
              <Link to="/login" className="hover:text-white transition-colors">
                Customer & Admin Sign In
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
            Demo Environment Info
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            All 24 catalog items are clearly labelled with{' '}
            <code className="text-amber-300">[DEMO]</code> prefixes and{' '}
            <code className="text-amber-300">DEMO-*</code> SKUs. No real money
            is charged in development or test mode.
          </p>
          <p className="text-xs text-slate-500">
            Currency: Indian Rupee (₹ / INR)
            <br />
            GST Standard Rate: 18%
          </p>
        </div>
      </div>

      {/* Bottom Copyright */}
      <div className="border-t border-slate-800 py-5 px-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ShopSphere India (Demo E-Commerce
        Platform). Built for Full-Stack Engineering & Campus Interview Prep.
      </div>
    </footer>
  );
};
