import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Star,
  ShoppingCart,
  Heart,
  ShieldCheck,
  Truck,
  PackageCheck,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  MessageSquare,
  Send,
} from 'lucide-react';
import { useProductDetail } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { useAddToCart } from '../hooks/useCart';
import {
  useWishlist,
  useAddToWishlist,
  useRemoveFromWishlist,
} from '../hooks/useWishlist';
import { reviewsApi } from '../api/reviews.api';
import { getApiErrorMessage } from '../api/client';
import {
  calculateDiscountPercent,
  formatPaiseToINR,
} from '../utils/currency';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

export const ProductDetailsPage: React.FC = () => {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: product,
    isLoading,
    isError,
  } = useProductDetail(slugOrId);

  const { user } = useAuth();
  const addToCartMutation = useAddToCart();
  const { data: wishlistItems } = useWishlist();
  const addToWishlistMutation = useAddToWishlist();
  const removeFromWishlistMutation = useRemoveFromWishlist();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    showCartLink?: boolean;
  } | null>(null);

  // Review form state
  const [rating, setRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setActionFeedback(null);
    setReviewFeedback(null);
  }, [slugOrId]);

  if (isLoading) {
    return (
      <div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-8"
        aria-busy="true"
      >
        <div className="h-4 w-64 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 aspect-square bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded" />
            <div className="h-8 w-full bg-slate-200 rounded" />
            <div className="h-10 w-48 bg-slate-200 rounded" />
            <div className="h-24 w-full bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Product Not Found</h1>
        <p className="text-sm text-slate-600">
          The product you are looking for does not exist or may have been
          removed from the catalog.
        </p>
        <div className="pt-2">
          <Link to="/products" className="btn-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Product Catalog
          </Link>
        </div>
      </div>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          {
            id: 'fallback',
            url: FALLBACK_IMAGE,
            altText: product.title,
            displayOrder: 0,
            isPrimary: true,
          },
        ];

  const activeImage = images[selectedImageIndex] || images[0];
  const discountPercent = calculateDiscountPercent(
    product.pricePaise,
    product.mrpPaise
  );
  const savingsPaise = Math.max(0, product.mrpPaise - product.pricePaise);
  const isOutOfStock = product.stockQuantity <= 0;
  const maxSelectableQty = Math.min(10, Math.max(1, product.stockQuantity));

  const specEntries = product.specifications
    ? Object.entries(product.specifications)
    : [];

  const isInWishlist = Boolean(
    wishlistItems?.some((item) => item.productId === product.id)
  );

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setActionFeedback(null);
    try {
      await addToCartMutation.mutateAsync({
        productId: product.id,
        quantity,
      });
      setActionFeedback({
        type: 'success',
        message: `Added ${quantity} × "${product.title}" (${formatPaiseToINR(
          product.pricePaise * quantity,
          { trimZeroPaise: true }
        )}) to your shopping cart.`,
        showCartLink: true,
      });
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error),
      });
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setActionFeedback(null);
    try {
      if (isInWishlist) {
        await removeFromWishlistMutation.mutateAsync(product.id);
        setActionFeedback({
          type: 'success',
          message: `Removed "${product.title}" from your wishlist.`,
        });
      } else {
        await addToWishlistMutation.mutateAsync(product.id);
        setActionFeedback({
          type: 'success',
          message: `Saved "${product.title}" to your wishlist.`,
        });
      }
    } catch (error) {
      setActionFeedback({
        type: 'error',
        message: getApiErrorMessage(error),
      });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    setReviewFeedback(null);
    setIsSubmittingReview(true);
    try {
      await reviewsApi.upsertReview({
        productId: product.id,
        rating,
        title: reviewTitle.trim() || undefined,
        comment: reviewComment.trim(),
      });
      setReviewTitle('');
      setReviewComment('');
      setReviewFeedback({
        type: 'success',
        message:
          'Your review has been saved and product ratings have been recalculated.',
      });
      await queryClient.invalidateQueries({
        queryKey: ['products', 'detail', slugOrId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['products'],
      });
    } catch (error) {
      setReviewFeedback({
        type: 'error',
        message: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-14">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-slate-500"
      >
        <Link to="/" className="hover:text-brand-600">
          Home
        </Link>
        <span>/</span>
        <Link to="/products" className="hover:text-brand-600">
          Products
        </Link>
        <span>/</span>
        <Link
          to={`/products?category=${encodeURIComponent(product.category.slug)}`}
          className="hover:text-brand-600"
        >
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium truncate max-w-xs">
          {product.title}
        </span>
      </nav>

      {/* Primary Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square w-full rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
            <img
              src={activeImage.url}
              alt={activeImage.altText || product.title}
              width={600}
              height={600}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {product.isDemo && <span className="badge-demo">DEMO ITEM</span>}
              {discountPercent > 0 && (
                <span className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`relative h-20 w-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    idx === selectedImageIndex
                      ? 'border-brand-600 ring-2 ring-brand-600/20'
                      : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText || `${product.title} view ${idx + 1}`}
                    width={80}
                    height={80}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Purchase Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                to={`/products?category=${encodeURIComponent(
                  product.category.slug
                )}`}
                className="rounded-full bg-brand-50 border border-brand-200 px-3 py-0.5 font-semibold text-brand-700 hover:bg-brand-100"
              >
                {product.category.name}
              </Link>
              {product.brand && (
                <span className="text-slate-500 font-medium">
                  Brand: <strong className="text-slate-800">{product.brand}</strong>
                </span>
              )}
              <span className="text-slate-400">•</span>
              <span className="font-mono text-slate-500">SKU: {product.sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {product.title}
            </h1>

            {/* Rating Summary */}
            <div className="flex items-center gap-3 pt-1">
              {product.reviewCount > 0 ? (
                <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{Number(product.ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    ({product.reviewCount} verified{' '}
                    {product.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  No customer reviews yet — be the first to review below
                </span>
              )}
            </div>
          </div>

          {/* Pricing Block (Paise -> Formatted INR) */}
          <div className="rounded-2xl bg-slate-100/80 border border-slate-200/80 p-5 space-y-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatPaiseToINR(product.pricePaise, { trimZeroPaise: true })}
              </span>
              {product.mrpPaise > product.pricePaise && (
                <>
                  <span className="text-base text-slate-400 line-through">
                    MRP{' '}
                    {formatPaiseToINR(product.mrpPaise, {
                      trimZeroPaise: true,
                    })}
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    Save{' '}
                    {formatPaiseToINR(savingsPaise, { trimZeroPaise: true })} (
                    {discountPercent}% OFF)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Inclusive of all taxes • 18% GST invoice provided on checkout •
              Stored server-side as{' '}
              <code className="text-slate-700 font-mono">
                {product.pricePaise} paise
              </code>
            </p>
          </div>

          {/* Short & Full Description */}
          <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
            {product.shortDescription && (
              <p className="font-medium text-slate-900">
                {product.shortDescription}
              </p>
            )}
            <p>{product.description}</p>
          </div>

          {/* Stock & Quantity Controls */}
          <div className="pt-2 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-rose-600">
                    <AlertCircle className="h-4 w-4" />
                    Currently Out of Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <PackageCheck className="h-4 w-4" />
                    In Stock ({product.stockQuantity} units available)
                  </span>
                )}
              </div>

              {!isOutOfStock && (
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="qty-select"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Quantity:
                  </label>
                  <select
                    id="qty-select"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="input-field !w-20 !py-1.5 !text-xs font-semibold"
                  >
                    {Array.from(
                      { length: maxSelectableQty },
                      (_, i) => i + 1
                    ).map((num) => (
                      <option key={num} value={num}>
                        {num}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isOutOfStock || addToCartMutation.isPending}
                onClick={handleAddToCart}
                className="btn-primary flex-1 !py-3 !text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                {isOutOfStock
                  ? 'Out of Stock'
                  : addToCartMutation.isPending
                  ? 'Adding to Cart...'
                  : 'Add to Cart'}
              </button>

              <button
                type="button"
                disabled={
                  addToWishlistMutation.isPending ||
                  removeFromWishlistMutation.isPending
                }
                onClick={handleToggleWishlist}
                className={`btn-secondary !py-3 !px-5 !text-sm ${
                  isInWishlist
                    ? '!border-rose-300 !bg-rose-50 !text-rose-700'
                    : ''
                }`}
              >
                <Heart
                  className={`h-4 w-4 text-rose-500 ${
                    isInWishlist ? 'fill-rose-500' : ''
                  }`}
                />
                {isInWishlist ? 'Saved in Wishlist' : 'Save to Wishlist'}
              </button>
            </div>

            {actionFeedback && (
              <div
                role="status"
                className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
                  actionFeedback.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {actionFeedback.type === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
                {actionFeedback.showCartLink && (
                  <Link
                    to="/cart"
                    className="shrink-0 font-bold text-brand-700 hover:underline"
                  >
                    View Cart →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Delivery & Security Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-start gap-3">
              <Truck className="h-5 w-5 text-brand-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">
                  Pan-India Delivery
                </p>
                <p className="text-slate-500 mt-0.5">
                  {product.pricePaise >= 49900
                    ? 'Eligible for FREE Delivery'
                    : 'Flat ₹49 delivery (Free above ₹499)'}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-slate-900">
                  Transactional Stock Lock
                </p>
                <p className="text-slate-500 mt-0.5">
                  Protected against overselling via PostgreSQL ACID
                  transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications & Customer Reviews Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-slate-200">
        {/* Technical Specifications */}
        <section className="lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Technical Specifications
            </h2>
          </div>

          {specEntries.length > 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <dl className="divide-y divide-slate-200 text-xs sm:text-sm">
                {specEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-3 gap-4 px-4 py-3 odd:bg-slate-50/60"
                  >
                    <dt className="font-medium text-slate-500 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </dt>
                    <dd className="col-span-2 font-semibold text-slate-900">
                      {typeof value === 'boolean'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No additional technical specifications listed for this item.
            </p>
          )}
        </section>

        {/* Customer Reviews (Strictly Real DB Records + Review Submission Form) */}
        <section className="lg:col-span-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Customer Reviews ({product.reviews.length})
              </h2>
            </div>
          </div>

          {/* Interactive Review Submission Card */}
          {user ? (
            <form
              onSubmit={handleReviewSubmit}
              className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Write or Update Your Review
                </h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((starValue) => (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      aria-label={`Rate ${starValue} out of 5 stars`}
                      className="p-0.5"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          starValue <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Review headline (e.g., Great battery backup)"
                  maxLength={120}
                  className="input-field !py-2 !text-xs"
                />
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your honest experience with this product..."
                  rows={2}
                  maxLength={1500}
                  className="input-field !py-2 !text-xs"
                />
              </div>

              {reviewFeedback && (
                <p
                  className={`text-xs font-medium ${
                    reviewFeedback.type === 'error'
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {reviewFeedback.message}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="btn-primary !py-1.5 !px-3.5 !text-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Purchased this item? Sign in to post a verified customer review.
              </span>
              <Link
                to="/login"
                className="font-semibold text-brand-600 hover:underline shrink-0"
              >
                Sign In →
              </Link>
            </div>
          )}

          {product.reviews.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                No verified reviews yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                In compliance with our zero-fabricated-data rule, ShopSphere
                displays only real customer reviews stored in PostgreSQL.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {product.reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {review.user.fullName}
                      </span>
                      {review.isVerifiedPurchase && (
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      <span>{review.rating}/5</span>
                    </div>
                  </div>
                  {review.title && (
                    <h3 className="text-xs font-bold text-slate-800">
                      {review.title}
                    </h3>
                  )}
                  {review.comment && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Related Products Section */}
      {product.relatedProducts && product.relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              More in {product.category.name}
            </h2>
            <Link
              to={`/products?category=${encodeURIComponent(
                product.category.slug
              )}`}
              className="text-xs font-semibold text-brand-600 hover:underline"
            >
              View all in category →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.relatedProducts.map((rel) => {
              const relDiscount = calculateDiscountPercent(
                rel.pricePaise,
                rel.mrpPaise
              );
              return (
                <Link
                  key={rel.id}
                  to={`/products/${encodeURIComponent(rel.slug)}`}
                  className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between gap-3"
                >
                  <div className="aspect-square w-full rounded-xl bg-slate-100 overflow-hidden relative">
                    <img
                      src={rel.primaryImage?.url || FALLBACK_IMAGE}
                      alt={rel.primaryImage?.altText || rel.title}
                      width={300}
                      height={300}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {rel.isDemo && (
                      <span className="badge-demo absolute top-2 left-2">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-brand-600">
                      {rel.title}
                    </h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {formatPaiseToINR(rel.pricePaise, {
                          trimZeroPaise: true,
                        })}
                      </span>
                      {relDiscount > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-600">
                          {relDiscount}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
