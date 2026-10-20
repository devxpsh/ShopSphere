import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  PackageCheck,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist, useRemoveFromWishlist } from '../hooks/useWishlist';
import { useAddToCart } from '../hooks/useCart';
import {
  calculateDiscountPercent,
  formatPaiseToINR,
} from '../utils/currency';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useAuth();
  const { data: items = [], isLoading: isWishlistLoading } = useWishlist();
  const removeMutation = useRemoveFromWishlist();
  const addToCartMutation = useAddToCart();

  if (isUserLoading || (user && isWishlistLoading)) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6"
        aria-busy="true"
      >
        <div className="h-8 w-56 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Sign in to view your saved wishlist
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Save your favourite products across devices and move them to your cart
          whenever you are ready to order.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to="/login" className="btn-primary">
            Sign In
          </Link>
          <Link to="/products" className="btn-secondary">
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  const handleMoveToCart = async (productId: string) => {
    await addToCartMutation.mutateAsync({ productId, quantity: 1 });
    await removeMutation.mutateAsync(productId);
    navigate('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            My Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <Link to="/products" className="btn-secondary !py-2 !px-3.5 !text-xs">
          Continue Shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <Heart className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Your wishlist is empty
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tap the heart icon on any product detail page to bookmark items for
            later purchase.
          </p>
          <div className="pt-2">
            <Link to="/products" className="btn-primary">
              Browse Catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const { product } = item;
            const discount = calculateDiscountPercent(
              product.pricePaise,
              product.mrpPaise
            );
            const isOutOfStock = product.stockQuantity <= 0;
            const primaryImg =
              product.images?.find((img) => img.isPrimary) ||
              product.images?.[0];

            return (
              <article
                key={item.id}
                className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <Link
                    to={`/products/${encodeURIComponent(product.slug)}`}
                    className="block aspect-square w-full rounded-xl bg-slate-100 overflow-hidden relative"
                  >
                    <img
                      src={primaryImg?.url || FALLBACK_IMAGE}
                      alt={primaryImg?.altText || product.name}
                      width={300}
                      height={300}
                      loading="lazy"
                      className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-brand-600">
                      {product.category.name}
                    </span>
                    <Link
                      to={`/products/${encodeURIComponent(product.slug)}`}
                      className="block text-sm font-bold text-slate-900 hover:text-brand-600 line-clamp-2"
                    >
                      {product.name}
                    </Link>

                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-base font-extrabold text-slate-900">
                        {formatPaiseToINR(product.pricePaise, {
                          trimZeroPaise: true,
                        })}
                      </span>
                      {discount > 0 && (
                        <span className="text-xs font-bold text-emerald-600">
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    <div className="pt-1 text-xs">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Out of Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <PackageCheck className="h-3.5 w-3.5" />
                          In Stock ({product.stockQuantity})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={
                      isOutOfStock ||
                      addToCartMutation.isPending ||
                      removeMutation.isPending
                    }
                    onClick={() => handleMoveToCart(product.id)}
                    className="btn-primary flex-1 !py-2 !text-xs"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    Move to Cart
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name} from wishlist`}
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(product.id)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
