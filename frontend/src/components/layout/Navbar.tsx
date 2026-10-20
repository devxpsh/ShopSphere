import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  Heart,
  ShoppingCart,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCategories } from '../../hooks/useCategories';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { data: categories } = useCategories();
  const { data: cart } = useCart();
  const { data: wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemCount = isAuthenticated ? (cart?.summary.totalQuantity ?? 0) : 0;
  const wishlistCount = isAuthenticated ? (wishlistItems?.length ?? 0) : 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      navigate(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/products');
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      {/* Top Announcement Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-400/30">
              <Sparkles className="h-3 w-3" />
              DEMO STORE
            </span>
            <span>
              Free pan-India delivery on orders above ₹499 • 18% GST Invoice
              Ready
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-slate-300">
            <span>All prices in ₹ (INR)</span>
            <span>•</span>
            <Link
              to="/products?featured=true"
              className="hover:text-white underline-offset-2 hover:underline"
            >
              Featured Deals
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-900 font-bold text-xl tracking-tight shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span>ShopSphere</span>
              <span className="text-brand-600">.in</span>
            </div>
          </Link>

          {/* Desktop Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl mx-4"
            role="search"
          >
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search 20+ demo products, brands, or categories..."
                aria-label="Search products"
                className="w-full rounded-full border border-slate-300 bg-slate-50 pl-10 pr-24 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-brand-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <NavLink
              to="/products"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              Catalog
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/orders"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                <Package className="h-4 w-4" />
                Orders
              </NavLink>
            )}

            <Link
              to="/wishlist"
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              to="/cart"
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span
                  data-testid="navbar-cart-badge"
                  className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
                >
                  {cartItemCount}
                </span>
              )}
            </Link>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5 text-brand-600" />
                  <span className="max-w-[120px] truncate">
                    {user.fullName}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 !px-3.5">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/cart"
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Category Quick Links Bar (Desktop) */}
        {categories && categories.length > 0 && (
          <nav
            aria-label="Product Categories"
            className="hidden md:flex items-center gap-1 py-2 border-t border-slate-100 overflow-x-auto no-scrollbar"
          >
            <Link
              to="/products"
              className="px-3 py-1 rounded-full text-xs font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors shrink-0"
            >
              All Categories
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="px-3 py-1 rounded-full text-xs font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors shrink-0"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} role="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products..."
                className="input-field pl-9 pr-20"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white"
              >
                Go
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-secondary !justify-start"
            >
              All Products
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-secondary !justify-start"
            >
              <Heart className="h-4 w-4" />
              Wishlist {wishlistCount > 0 ? `(${wishlistCount})` : ''}
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary !justify-start"
                >
                  <Package className="h-4 w-4" />
                  My Orders
                </Link>
                <Link
                  to="/addresses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary !justify-start"
                >
                  Saved Addresses
                </Link>
              </>
            )}
          </div>

          {categories && categories.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Categories
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${encodeURIComponent(cat.slug)}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200">
            {isAuthenticated && user ? (
              <div className="flex items-center justify-between">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary !py-1.5 !px-3 text-rose-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-secondary"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
