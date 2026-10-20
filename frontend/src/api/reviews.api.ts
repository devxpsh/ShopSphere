import { apiRequest } from './client';
import type { ProductReview } from '../types';

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
}

export const reviewsApi = {
  async listProductReviews(productId: string): Promise<ProductReview[]> {
    const res = await apiRequest<{ reviews: ProductReview[] }>(
      `/reviews/product/${productId}`
    );
    return res.data.reviews;
  },

  async upsertReview(payload: CreateReviewPayload): Promise<{
    review: ProductReview;
    productRatingStats: { averageRating: number; reviewCount: number };
  }> {
    const res = await apiRequest<{
      review: ProductReview;
      productRatingStats: { averageRating: number; reviewCount: number };
    }>('/reviews', {
      method: 'POST',
      body: payload,
    });
    return res.data;
  },

  async deleteReview(reviewId: string): Promise<{
    deletedId: string;
    productRatingStats: { averageRating: number; reviewCount: number };
  }> {
    const res = await apiRequest<{
      deletedId: string;
      productRatingStats: { averageRating: number; reviewCount: number };
    }>(`/reviews/${reviewId}`, {
      method: 'DELETE',
    });
    return res.data;
  },
};
