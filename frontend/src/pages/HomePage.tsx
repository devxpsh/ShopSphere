import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Tag,
  Layers,
  ShieldCheck,
  Truck,
  IndianRupee,
  AlertTriangle,
} from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { ProductCard } from '../components/common/ProductCard';
import { ProductGridSkeleton } from '../components/common/ProductGridSkeleton';

export const HomePage: React.FC = () => {
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useCategories();

  const {
    data: featuredData,
    isLoading: featuredLoading,
    isError: featuredError,
  } = useProducts({
    featured: true,
    limit: 8,
    sortBy: 'newest',
  });

  const {
    data: newestData,
    isLoading: newestLoading,
    isError: newestError,
  } = useProducts({
    limit: 4,
    sortBy: 'newest',
  });

  const totalCatalogCount = newestData?.pagination.totalItems ?? 0;

  return (
    <div className="space-y-14 pb-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 border border-brand-400/30 px-3.5 py-1.5 text-xs font-semibold text-brand-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  ShopSphere India • Live PostgreSQL Catalog (
                  {totalCatalogCount > 0 ? `${totalCatalogCount} Demo Items` : 'Real-Time API'})
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Quality Shopping Built for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-indigo-200 to-amber-200">
                  Modern India
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Explore curated Electronics, Ethnic &amp; Western Wear, Home
                &amp; Kitchen appliances, Engineering Books, and Fitness gear.
                Every price is stored in exact integer paise and verified on the
                server.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition-all"
                >
                  Browse Full Catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/products?featured=true"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition-all"
                >
                  View Featured Deals
                </Link>
              </div>

              {/* Authentic System Highlights (No Fabricated Metrics) */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg text-xs text-slate-300">
                <div>
                  <p className="font-bold text-white text-sm">
                    {categories?.length ?? 6} Categories
                  </p>
                  <p className="text-slate-400">Live from PostgreSQL</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">₹ Paise Engine</p>
                  <p className="text-slate-400">Zero float rounding</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">18% GST Ready</p>
                  <p className="text-slate-400">Transparent billing</p>
                </div>
              </div>
            </div>

            {/* Hero Feature Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm space-y-2">
                <div className="h-10 w-10 rounded-xl bg-brand-500/20 text-brand-300 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold text-white">
                  Transparent INR Pricing
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Prices and discounts are calculated server-side in integer
                  paise (`₹1.00 = 100 paise`).
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm space-y-2">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-bold text-white">
                  Clearly Labelled Demo Store
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  All seeded products carry a `[DEMO]` badge and `DEMO-*` SKU so
                  test records are always unmistakable.
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur-sm space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Tag className="h-4 w-4" />
                    Active Demo Promo Codes (Seeded in DB)
                  </div>
                  <span className="badge-demo">TEST MODE</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2">
                    <p className="font-mono text-xs font-bold text-amber-300">
                      WELCOME10
                    </p>
                    <p className="text-[11px] text-slate-300">
                      10% OFF above ₹999
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2">
                    <p className="font-mono text-xs font-bold text-emerald-300">
                      FESTIVE500
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Flat ₹500 OFF above ₹3,999
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/70 border border-slate-700 px-3 py-2">
                    <p className="font-mono text-xs font-bold text-sky-300">
                      CAMPUS15
                    </p>
                    <p className="text-[11px] text-slate-300">
                      15% OFF above ₹1,499
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
              <Layers className="h-3.5 w-3.5" />
              Curated Departments
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Shop by Category
            </h2>
          </div>
          <Link
            to="/products"
            className="text-sm font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
          >
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-40 rounded-2xl bg-slate-200 animate-pulse"
              />
            ))}
          </div>
        ) : categoriesError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Unable to load categories from the backend API. Make sure the
              backend server is running on port 4000.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories?.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="group relative rounded-2xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-brand-400 transition-all flex flex-col justify-between overflow-hidden"
              >
                {cat.imageUrl && (
                  <div className="aspect-[4/3] w-full rounded-xl bg-slate-100 overflow-hidden mb-3">
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      width={240}
                      height={180}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cat.productCount}{' '}
                    {cat.productCount === 1 ? 'product' : 'products'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
              <Sparkles className="h-3.5 w-3.5" />
              Handpicked Deals
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Featured Demo Products
            </h2>
          </div>
          <Link
            to="/products?featured=true"
            className="text-sm font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
          >
            See all featured <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredLoading ? (
          <ProductGridSkeleton count={8} />
        ) : featuredError ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-6 text-sm text-rose-700">
            Could not load featured products. Ensure the backend server (`npm
            run dev` in `/backend`) and PostgreSQL container are running.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredData?.items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                priorityImage={index < 4}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mid-Page Delivery Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-700 p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-100">
              <Truck className="h-4 w-4" />
              Pan-India Express Fulfilment
            </div>
            <h3 className="text-xl sm:text-2xl font-bold">
              Free Shipping on Orders Above ₹499
            </h3>
            <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
              Orders below ₹499 incur a flat ₹49 delivery fee. All prices and
              tax calculations are verified server-side inside PostgreSQL ACID
              transactions.
            </p>
          </div>
          <Link
            to="/products?inStock=true"
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50 transition-colors shrink-0 shadow-sm"
          >
            Shop In-Stock Items
          </Link>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Just Added
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              New Arrivals
            </h2>
          </div>
          <Link
            to="/products?sortBy=newest"
            className="text-sm font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
          >
            Explore catalog <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {newestLoading ? (
          <ProductGridSkeleton count={4} />
        ) : !newestError && newestData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newestData.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
