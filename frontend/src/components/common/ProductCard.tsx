import React from 'react';
import { Link } from 'react-router-dom';
import { Star, PackageCheck, AlertCircle } from 'lucide-react';
import type { Product } from '../../types';
import {
  calculateDiscountPercent,
  formatPaiseToINR,
} from '../../utils/currency';

interface ProductCardProps {
  product: Product;
  priorityImage?: boolean;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  priorityImage = false,
}) => {
  const discountPercent = calculateDiscountPercent(
    product.pricePaise,
    product.mrpPaise
  );
  const rawPrimary = product.primaryImage as
    | { url: string; altText: string | null }
    | string
    | null
    | undefined;
  const imageUrl =
    typeof rawPrimary === 'string'
      ? rawPrimary
      : rawPrimary?.url || FALLBACK_IMAGE;
  const displayTitle = product.title || product.name || 'ShopSphere Product';
  const imageAlt =
    (typeof rawPrimary === 'object' ? rawPrimary?.altText : null) ||
    displayTitle;
  const ratingValue = Number(product.ratingAvg ?? 0);
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock =
    product.stockQuantity > 0 &&
    product.stockQuantity <= product.lowStockThreshold;

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-200 flex flex-col">
      {/* Image Container with aspect-square & explicit width/height to prevent CLS */}
      <Link
        to={`/products/${encodeURIComponent(product.slug)}`}
        className="relative aspect-square w-full bg-slate-100 overflow-hidden block"
      >
        <img
          src={imageUrl}
          alt={imageAlt}
          width={400}
          height={400}
          loading={priorityImage ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.isDemo && <span className="badge-demo">DEMO</span>}
          {discountPercent > 0 && (
            <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
            <span className="rounded-full bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-600 shadow">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="font-medium text-brand-600 truncate">
              {product.category.name}
            </span>
            {product.brand && (
              <span className="truncate font-medium text-slate-500">
                {product.brand}
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 group-hover:text-brand-600 transition-colors">
            <Link to={`/products/${encodeURIComponent(product.slug)}`}>
              {displayTitle}
            </Link>
          </h3>

          {product.shortDescription && (
            <p className="text-xs text-slate-500 line-clamp-2">
              {product.shortDescription}
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2">
          {/* Rating & Stock Row */}
          <div className="flex items-center justify-between text-xs">
            {product.reviewCount > 0 ? (
              <div className="inline-flex items-center gap-1 font-medium text-slate-700">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>{ratingValue.toFixed(1)}</span>
                <span className="text-slate-400">({product.reviewCount})</span>
              </div>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">
                No reviews yet
              </span>
            )}

            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                Unavailable
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                Only {product.stockQuantity} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <PackageCheck className="h-3.5 w-3.5" />
                In Stock
              </span>
            )}
          </div>

          {/* Price Row (Integer Paise -> Formatted INR) */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-900">
                {formatPaiseToINR(product.pricePaise, { trimZeroPaise: true })}
              </span>
              {product.mrpPaise > product.pricePaise && (
                <span className="text-xs text-slate-400 line-through">
                  {formatPaiseToINR(product.mrpPaise, { trimZeroPaise: true })}
                </span>
              )}
            </div>

            <Link
              to={`/products/${encodeURIComponent(product.slug)}`}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 shrink-0"
            >
              View Details →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};
