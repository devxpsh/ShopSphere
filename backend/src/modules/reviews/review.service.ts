import { OrderStatus, Prisma, ReviewStatus, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { CreateReviewInput } from './review.validation';

export async function recalculateProductRatingStats(
  productId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<{ averageRating: number; reviewCount: number }> {
  const aggregate = await tx.review.aggregate({
    where: {
      productId,
      status: ReviewStatus.APPROVED,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  const reviewCount = aggregate._count.id;
  const averageRating =
    reviewCount > 0 && aggregate._avg.rating !== null
      ? Number(aggregate._avg.rating.toFixed(2))
      : 0;

  await tx.product.update({
    where: { id: productId },
    data: {
      averageRating,
      reviewCount,
    },
  });

  return { averageRating, reviewCount };
}

export class ReviewService {
  /**
   * Lists all APPROVED reviews for a given product.
   */
  public static async listProductReviews(productId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
        status: ReviewStatus.APPROVED,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  /**
   * Creates or updates a user's review for a product, automatically detecting
   * whether the user has a verified purchase in their order history and recalculating
   * the product's averageRating & reviewCount from real database records.
   */
  public static async upsertReview(userId: string, input: CreateReviewInput) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: input.productId },
      });

      if (!product || !product.isActive) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Check if user has purchased this product in a non-cancelled order
      const matchingOrderItem = await tx.orderItem.findFirst({
        where: {
          productId: input.productId,
          order: {
            userId,
            status: {
              not: OrderStatus.CANCELLED,
            },
          },
        },
        select: {
          orderId: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const isVerifiedPurchase = Boolean(matchingOrderItem);
      const orderId = matchingOrderItem?.orderId ?? null;

      const review = await tx.review.upsert({
        where: {
          userId_productId: {
            userId,
            productId: input.productId,
          },
        },
        update: {
          rating: input.rating,
          title: input.title ?? null,
          comment: input.comment,
          isVerifiedPurchase,
          orderId,
          status: ReviewStatus.APPROVED,
        },
        create: {
          userId,
          productId: input.productId,
          orderId,
          rating: input.rating,
          title: input.title ?? null,
          comment: input.comment,
          isVerifiedPurchase,
          status: ReviewStatus.APPROVED,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      const stats = await recalculateProductRatingStats(input.productId, tx);

      return {
        review,
        productRatingStats: stats,
      };
    });
  }

  /**
   * Deletes a review (allowed for review owner or ADMIN) and recalculates product rating stats.
   */
  public static async deleteReview(reviewId: string, requesterId: string, requesterRole: Role) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id: reviewId },
      });

      if (!review) {
        throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
      }

      if (review.userId !== requesterId && requesterRole !== Role.ADMIN) {
        throw new AppError(
          'You do not have permission to delete this review',
          403,
          'FORBIDDEN_RESOURCE'
        );
      }

      await tx.review.delete({
        where: { id: review.id },
      });

      const stats = await recalculateProductRatingStats(review.productId, tx);

      return {
        deletedId: review.id,
        productRatingStats: stats,
      };
    });
  }
}
