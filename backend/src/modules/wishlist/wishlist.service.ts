import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export class WishlistService {
  /**
   * Lists all wishlist items for the authenticated user, newest first.
   */
  public static async listWishlist(userId: string) {
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
            images: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        averageRating: Number(item.product.averageRating),
      },
    }));
  }

  /**
   * Adds a product to the user's wishlist (idempotent).
   */
  public static async addToWishlist(userId: string, productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new AppError('Product not found or currently unavailable', 404, 'PRODUCT_NOT_FOUND');
    }

    await prisma.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      update: {},
      create: {
        userId,
        productId,
      },
    });

    return WishlistService.listWishlist(userId);
  }

  /**
   * Removes a product from the user's wishlist.
   */
  public static async removeFromWishlist(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({
      where: {
        userId,
        productId,
      },
    });

    return WishlistService.listWishlist(userId);
  }
}
