import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Search,
  X,
  RotateCcw,
  PackageSearch,
  Sparkles,
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import { ProductCard } from '../components/common/ProductCard';
import { ProductGridSkeleton } from '../components/common/ProductGridSkeleton';
import { Pagination } from '../components/common/Pagination';
import { rupeesToPaise } from '../utils/currency';
import type { ProductSortBy } from '../types';

const SORT_OPTIONS: Array<{ value: ProductSortBy; label: string }> = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price_asc', label: 'Price: Low to High (₹)' },
  { value: 'price_desc', label: 'Price: High to Low (₹)' },
  { value: 'rating_desc', label: 'Customer Rating' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

const QUICK_PRICE_RANGES: Array<{
  label: string;
  minRupees?: number;
  maxRupees?: number;
}> = [
  { label: 'Under ₹1,000', maxRupees: 1000 },
  { label: '₹1,000 – ₹3,000', minRupees: 1000, maxRupees: 3000 },
  { label: '₹3,000 – ₹10,000', minRupees: 3000, maxRupees: 10000 },
  { label: 'Above ₹10,000', minRupees: 10000 },
];

export const ProductListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Read URL filter state
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const minPriceRupeesStr = searchParams.get('minPrice') || '';
  const maxPriceRupeesStr = searchParams.get('maxPrice') || '';
  const inStockParam = searchParams.get('inStock') === 'true';
  const featuredParam = searchParams.get('featured') === 'true';
  const sortBy = (searchParams.get('sortBy') as ProductSortBy) || 'newest';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));

  // Local controlled inputs for search and rupee range before applying
  const [searchText, setSearchText] = useState(q);
  const [minRupeesInput, setMinRupeesInput] = useState(minPriceRupeesStr);
  const [maxRupeesInput, setMaxRupeesInput] = useState(maxPriceRupeesStr);

  useEffect(() => {
    setSearchText(q);
    setMinRupeesInput(minPriceRupeesStr);
    setMaxRupeesInput(maxPriceRupeesStr);
  }, [q, minPriceRupeesStr, maxPriceRupeesStr]);

  // Convert Rupee URL parameters to integer paise for backend API
  const minPricePaise =
    minPriceRupeesStr !== '' && !Number.isNaN(Number(minPriceRupeesStr))
      ? rupeesToPaise(Number(minPriceRupeesStr))
      : undefined;

  const maxPricePaise =
    maxPriceRupeesStr !== '' && !Number.isNaN(Number(maxPriceRupeesStr))
      ? rupeesToPaise(Number(maxPriceRupeesStr))
      : undefined;

  const { data: categories } = useCategories();
  const {
    data: productData,
    isLoading,
    isFetching,
    isError,
  } = useProducts({
    q: q || undefined,
    category: category || undefined,
    brand: brand || undefined,
    minPricePaise,
    maxPricePaise,
    inStock: inStockParam ? true : undefined,
    featured: featuredParam ? true : undefined,
    sortBy,
    page,
    limit: 12,
  });

  const updateParams = (
    updates: Record<string, string | undefined>,
    resetPage = true
  ) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    if (resetPage) {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchText.trim() || undefined });
  };

  const handlePriceRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({
      minPrice: minRupeesInput.trim() || undefined,
      maxPrice: maxRupeesInput.trim() || undefined,
    });
  };

  const handleQuickPriceSelect = (minRupees?: number, maxRupees?: number) => {
    updateParams({
      minPrice: minRupees !== undefined ? String(minRupees) : undefined,
      maxPrice: maxRupees !== undefined ? String(maxRupees) : undefined,
    });
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeCategoryName =
    categories?.find((c) => c.slug === category || c.id === category)?.name ||
    category;

  const hasActiveFilters = Boolean(
    q ||
      category ||
      brand ||
      minPriceRupeesStr ||
      maxPriceRupeesStr ||
      inStockParam ||
      featuredParam
  );

  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Keyword Search inside Filter Panel */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Keyword Search
        </h3>
        <form onSubmit={handleSearchFormSubmit} className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Title, brand, SKU..."
              aria-label="Filter by keyword"
              className="input-field !py-1.5 !pl-8 !text-xs"
            />
          </div>
          <button
            type="submit"
            className="btn-primary !py-1.5 !px-3 !text-xs shrink-0"
          >
            Apply
          </button>
        </form>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Categories
        </h3>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => updateParams({ category: undefined })}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              !category
                ? 'bg-brand-50 text-brand-700 font-semibold'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>All Categories</span>
          </button>
          {categories?.map((cat) => {
            const isSelected = category === cat.slug || category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  updateParams({
                    category: isSelected ? undefined : cat.slug,
                  })
                }
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {cat.productCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter (Rupees UI -> Integer Paise API) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          Price Range (₹ INR)
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_PRICE_RANGES.map((range) => {
            const isSelected =
              minPriceRupeesStr ===
                (range.minRupees !== undefined
                  ? String(range.minRupees)
                  : '') &&
              maxPriceRupeesStr ===
                (range.maxRupees !== undefined ? String(range.maxRupees) : '');
            return (
              <button
                key={range.label}
                type="button"
                onClick={() =>
                  isSelected
                    ? handleQuickPriceSelect(undefined, undefined)
                    : handleQuickPriceSelect(range.minRupees, range.maxRupees)
                }
                className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handlePriceRangeSubmit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="min-price-input"
                className="block text-[11px] text-slate-500 mb-1"
              >
                Min (₹)
              </label>
              <input
                id="min-price-input"
                type="number"
                min={0}
                value={minRupeesInput}
                onChange={(e) => setMinRupeesInput(e.target.value)}
                placeholder="0"
                className="input-field !py-1.5 !text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="max-price-input"
                className="block text-[11px] text-slate-500 mb-1"
              >
                Max (₹)
              </label>
              <input
                id="max-price-input"
                type="number"
                min={0}
                value={maxRupeesInput}
                onChange={(e) => setMaxRupeesInput(e.target.value)}
                placeholder="50000"
                className="input-field !py-1.5 !text-xs"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-secondary w-full !py-1.5 !text-xs"
          >
            Apply ₹ Filter
          </button>
        </form>
      </div>

      {/* Availability & Featured Toggles */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={inStockParam}
            onChange={(e) =>
              updateParams({
                inStock: e.target.checked ? 'true' : undefined,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
          <span>In-Stock Products Only</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={featuredParam}
            onChange={(e) =>
              updateParams({
                featured: e.target.checked ? 'true' : undefined,
              })
            }
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
          <span>Featured Deals Only</span>
        </label>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="btn-secondary w-full !text-xs text-rose-600 hover:text-rose-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All Filters
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="text-xs text-slate-500 mb-1 flex items-center gap-1.5"
          >
            <Link to="/" className="hover:text-brand-600">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Products</span>
            {activeCategoryName && (
              <>
                <span>/</span>
                <span className="text-brand-600 font-medium">
                  {activeCategoryName}
                </span>
              </>
            )}
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {activeCategoryName
              ? `${activeCategoryName}`
              : q
                ? `Search results for "${q}"`
                : 'All Demo Products'}
          </h1>
        </div>

        {/* Sort & Mobile Filter Trigger */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden btn-secondary !py-2 !px-3 !text-xs"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          <div className="flex items-center gap-2">
            <label
              htmlFor="sort-select"
              className="text-xs font-medium text-slate-600 shrink-0"
            >
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) =>
                updateParams({ sortBy: e.target.value }, false)
              }
              className="input-field !py-1.5 !text-xs !w-auto pr-8"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 py-4 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-500">
            Active Filters:
          </span>

          {q && (
            <button
              type="button"
              onClick={() => updateParams({ q: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
            >
              <span>Search: &ldquo;{q}&rdquo;</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {category && (
            <button
              type="button"
              onClick={() => updateParams({ category: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
            >
              <span>Category: {activeCategoryName}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {(minPriceRupeesStr || maxPriceRupeesStr) && (
            <button
              type="button"
              onClick={() =>
                updateParams({ minPrice: undefined, maxPrice: undefined })
              }
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700"
            >
              <span>
                Price: ₹{minPriceRupeesStr || '0'} – ₹
                {maxPriceRupeesStr || 'Any'}
              </span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {inStockParam && (
            <button
              type="button"
              onClick={() => updateParams({ inStock: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
            >
              <span>In Stock Only</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {featuredParam && (
            <button
              type="button"
              onClick={() => updateParams({ featured: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-800"
            >
              <Sparkles className="h-3 w-3" />
              <span>Featured Deals</span>
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-rose-600 hover:underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-28 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            {filterSidebarContent}
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* Status Header */}
          {productData && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Found{' '}
                <strong className="text-slate-900">
                  {productData.pagination.totalItems}
                </strong>{' '}
                matching products
              </span>
              {isFetching && (
                <span className="text-brand-600 font-medium animate-pulse">
                  Updating catalog...
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <ProductGridSkeleton count={9} />
          ) : isError ? (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-8 text-center space-y-3">
              <p className="text-base font-bold text-rose-800">
                Unable to load products from the server
              </p>
              <p className="text-xs text-rose-600 max-w-md mx-auto">
                Verify that the Express backend is running on port 4000 and
                PostgreSQL is healthy.
              </p>
            </div>
          ) : productData && productData.items.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-4">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <PackageSearch className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">
                  No matching products found
                </h2>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We couldn&apos;t find any products matching your current
                  search or filter criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn-primary !text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </button>
            </div>
          ) : (
            productData && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {productData.items.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priorityImage={index < 3}
                    />
                  ))}
                </div>

                <Pagination
                  pagination={productData.pagination}
                  onPageChange={(newPage) =>
                    updateParams({ page: String(newPage) }, false)
                  }
                />
              </>
            )
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full overflow-y-auto p-5 shadow-xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Filter Products
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close Filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filterSidebarContent}
          </div>
        </div>
      )}
    </div>
  );
};
