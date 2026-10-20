import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { couponService } from '../coupons/coupon.service';
import {
  AddCartItemInput,
  MergeGuestCartInput,
  UpdateCartItemInput,
} from './cart.validation';

export const FREE_SHIPPING_THRESHOLD_PAISE = 49900; // ₹499.00
export const STANDARD_SHIPPING_FEE_PAISE = 4900; // ₹49.00
export const GST_RATE_PERCENT = 18; // 18% GST

export function calculateOrderTotalsPaise(
  subtotalPaise: number,
  discountPaise: number
) {
  const safeDiscountPaise = Math.min(Math.max(0, discountPaise), subtotalPaise);
  const taxableAmountPaise = Math.max(0, subtotalPaise - safeDiscountPaise);

  const shippingPaise =
    subtotalPaise === 0 || taxableAmountPaise >= FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : STANDARD_SHIPPING_FEE_PAISE;

  const taxPaise = Math.round((taxableAmountPaise * GST_RATE_PERCENT) / 100);
  const totalPaise = taxableAmountPaise + shippingPaise + taxPaise;

  return {
    subtotalPaise,
    discountPaise: safeDiscountPaise,
    taxableAmountPaise,
    shippingPaise,
    taxPaise,
    totalPaise,
  };
}

export class CartService {
  private async getOrCreateCartRecord(userId: string) {
    return prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async getCart(userId: string) {
    await this.getOrCreateCartRecord(userId);

    const cart = await prisma.cart.findUniqueOrThrow({
      where: { userId },
      include: {
        appliedCoupon: true,
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            product: {
              include: {
                category: {
                  select: { id: true, name: true, slug: true },
                },
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    const formattedItems = cart.items.map((item) => {
      const p = item.product;
      const primaryImage = p.images[0]
        ? { url: p.images[0].url, altText: p.images[0].altText }
        : null;
      const isDemo = p.sku.startsWith('DEMO-') || p.name.startsWith('[DEMO]');
      const lineSubtotalPaise = p.pricePaise * item.quantity;
      const lineMrpTotalPaise = p.mrpPaise * item.quantity;

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        lineSubtotalPaise,
        lineMrpTotalPaise,
        product: {
          id: p.id,
          sku: p.sku,
          title: p.name,
          slug: p.slug,
          brand: p.brand,
          pricePaise: p.pricePaise,
          mrpPaise: p.mrpPaise,
          stockQuantity: p.stockQuantity,
          isActive: p.isActive,
          isDemo,
          category: p.category,
          primaryImage,
        },
      };
    });

    const subtotalPaise = formattedItems.reduce(
      (sum, item) => sum + item.lineSubtotalPaise,
      0
    );
    const mrpTotalPaise = formattedItems.reduce(
      (sum, item) => sum + item.lineMrpTotalPaise,
      0
    );
    const productSavingsPaise = Math.max(0, mrpTotalPaise - subtotalPaise);
    const totalQuantity = formattedItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    // Re-validate applied coupon on the server
    let appliedCouponInfo: {
      id: string;
      code: string;
      description: string | null;
      discountType: string;
      discountValue: number;
      minOrderPaise: number;
      maxDiscountPaise: number | null;
    } | null = null;
    let discountPaise = 0;

    if (cart.appliedCoupon && subtotalPaise > 0) {
      try {
        const validated = await couponService.validateAndCalculateDiscount(
          cart.appliedCoupon.code,
          subtotalPaise,
          userId
        );
        appliedCouponInfo = validated.coupon;
        discountPaise = validated.discountPaise;
      } catch {
        // Coupon no longer valid for current cart; detach it silently
        await prisma.cart.update({
          where: { id: cart.id },
          data: { appliedCouponId: null },
        });
      }
    } else if (cart.appliedCoupon && subtotalPaise === 0) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { appliedCouponId: null },
      });
    }

    const totals = calculateOrderTotalsPaise(subtotalPaise, discountPaise);

    return {
      id: cart.id,
      userId: cart.userId,
      items: formattedItems,
      appliedCoupon: appliedCouponInfo,
      summary: {
        itemCount: formattedItems.length,
        totalQuantity,
        mrpTotalPaise,
        subtotalPaise: totals.subtotalPaise,
        productSavingsPaise,
        discountPaise: totals.discountPaise,
        shippingPaise: totals.shippingPaise,
        taxPaise: totals.taxPaise,
        totalPaise: totals.totalPaise,
        freeShippingThresholdPaise: FREE_SHIPPING_THRESHOLD_PAISE,
        amountForFreeShippingPaise:
          totals.subtotalPaise === 0
            ? FREE_SHIPPING_THRESHOLD_PAISE
            : Math.max(
                0,
                FREE_SHIPPING_THRESHOLD_PAISE - totals.taxableAmountPaise
              ),
      },
    };
  }

  async addItem(userId: string, input: AddCartItemInput) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });

    if (!product || !product.isActive) {
      throw new AppError(
        'Product not found or is currently unavailable.',
        404,
        'PRODUCT_NOT_FOUND'
      );
    }

    const cart = await this.getOrCreateCartRecord(userId);

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: input.productId,
        },
      },
    });

    const newQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (product.stockQuantity < newQuantity) {
      throw new AppError(
        product.stockQuantity === 0
          ? `"${product.name}" is currently out of stock.`
          : `Only ${product.stockQuantity} unit(s) of "${product.name}" available in stock.`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    if (newQuantity > 20) {
      throw new AppError(
        'Maximum 20 units of a single item allowed per order.',
        400,
        'MAX_CART_QUANTITY_EXCEEDED'
      );
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: input.productId,
        },
      },
      update: { quantity: newQuantity },
      create: {
        cartId: cart.id,
        productId: input.productId,
        quantity: input.quantity,
      },
    });

    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    input: UpdateCartItemInput
  ) {
    const cart = await this.getOrCreateCartRecord(userId);

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new AppError('Item not found in cart.', 404, 'CART_ITEM_NOT_FOUND');
    }

    if (input.quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: existingItem.id },
      });
      return this.getCart(userId);
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      throw new AppError(
        'Product is no longer available.',
        400,
        'PRODUCT_UNAVAILABLE'
      );
    }

    if (product.stockQuantity < input.quantity) {
      throw new AppError(
        `Only ${product.stockQuantity} unit(s) of "${product.name}" available in stock.`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: input.quantity },
    });

    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.getOrCreateCartRecord(userId);

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCartRecord(userId);

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
      prisma.cart.update({
        where: { id: cart.id },
        data: { appliedCouponId: null },
      }),
    ]);

    return this.getCart(userId);
  }

  async applyCoupon(userId: string, code: string) {
    const currentCart = await this.getCart(userId);

    if (currentCart.summary.subtotalPaise === 0) {
      throw new AppError(
        'Cannot apply a coupon to an empty cart.',
        400,
        'EMPTY_CART'
      );
    }

    const validated = await couponService.validateAndCalculateDiscount(
      code,
      currentCart.summary.subtotalPaise,
      userId
    );

    await prisma.cart.update({
      where: { id: currentCart.id },
      data: { appliedCouponId: validated.coupon.id },
    });

    return this.getCart(userId);
  }

  async removeCoupon(userId: string) {
    const cart = await this.getOrCreateCartRecord(userId);
    await prisma.cart.update({
      where: { id: cart.id },
      data: { appliedCouponId: null },
    });
    return this.getCart(userId);
  }

  async mergeGuestCart(userId: string, input: MergeGuestCartInput) {
    const cart = await this.getOrCreateCartRecord(userId);

    for (const guestItem of input.items) {
      const product = await prisma.product.findUnique({
        where: { id: guestItem.productId },
      });

      if (!product || !product.isActive || product.stockQuantity <= 0) {
        continue;
      }

      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_productId: {
            cartId: cart.id,
            productId: guestItem.productId,
          },
        },
      });

      const desiredQty = Math.min(
        20,
        product.stockQuantity,
        (existing?.quantity ?? 0) + guestItem.quantity
      );

      if (desiredQty > 0) {
        await prisma.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId: guestItem.productId,
            },
          },
          update: { quantity: desiredQty },
          create: {
            cartId: cart.id,
            productId: guestItem.productId,
            quantity: desiredQty,
          },
        });
      }
    }

    return this.getCart(userId);
  }
}

export const cartService = new CartService();
