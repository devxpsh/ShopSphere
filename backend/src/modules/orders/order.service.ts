import crypto from 'crypto';
import { OrderStatus, PaymentStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { couponService } from '../coupons/coupon.service';
import { calculateOrderTotalsPaise } from '../cart/cart.service';
import { CancelOrderInput, CreateOrderInput, ListOrdersQueryInput } from './order.validation';

function generateOrderNumber(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SS-${yyyy}${mm}${dd}-${randomSuffix}`;
}

export class OrderService {
  /**
   * Creates an order inside a database transaction:
   * 1. Verifies shipping address ownership.
   * 2. Validates cart items & deducts stock atomically with row-level conditions to prevent overselling.
   * 3. Recalculates all prices, GST, shipping, and coupon discounts on the server in integer paise.
   * 4. Creates Order, immutable OrderItem snapshots, InventoryLog entries, and initial Payment record.
   * 5. Clears the user's shopping cart.
   */
  public static async createOrderFromCart(userId: string, input: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify shipping address ownership
      const address = await tx.address.findUnique({
        where: { id: input.addressId },
      });

      if (!address) {
        throw new AppError('Shipping address not found', 404, 'ADDRESS_NOT_FOUND');
      }
      if (address.userId !== userId) {
        throw new AppError(
          'You do not have permission to use this shipping address',
          403,
          'FORBIDDEN_RESOURCE'
        );
      }

      // 2. Fetch user's cart with products and applied coupon
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: {
          appliedCoupon: true,
          items: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { displayOrder: 'asc' },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError('Cannot place an order with an empty cart', 400, 'CART_EMPTY');
      }

      // 3. Validate products, atomically deduct stock, and calculate server-side subtotal
      let subtotalPaise = 0;
      const stockTransitions: Array<{
        productId: string;
        quantity: number;
        previousStock: number;
        newStock: number;
      }> = [];

      const orderItemsData: Array<{
        productId: string;
        productNameSnapshot: string;
        productSkuSnapshot: string;
        productImageSnapshot: string | null;
        unitPricePaise: number;
        unitMrpPaise: number;
        quantity: number;
        lineTotalPaise: number;
      }> = [];

      for (const item of cart.items) {
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            images: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        });

        if (!currentProduct || !currentProduct.isActive) {
          throw new AppError(
            `Product "${item.product.name}" is no longer available`,
            400,
            'PRODUCT_UNAVAILABLE'
          );
        }

        // Atomic conditional stock decrement to prevent overselling under concurrent requests
        const updateResult = await tx.product.updateMany({
          where: {
            id: currentProduct.id,
            isActive: true,
            stockQuantity: {
              gte: item.quantity,
            },
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        if (updateResult.count === 0) {
          throw new AppError(
            `Insufficient stock for "${currentProduct.name}". Available: ${currentProduct.stockQuantity}`,
            400,
            'INSUFFICIENT_STOCK'
          );
        }

        const lineTotalPaise = currentProduct.pricePaise * item.quantity;
        subtotalPaise += lineTotalPaise;

        const primaryImage =
          currentProduct.images.find((img) => img.isPrimary)?.url ??
          currentProduct.images[0]?.url ??
          null;

        orderItemsData.push({
          productId: currentProduct.id,
          productNameSnapshot: currentProduct.name,
          productSkuSnapshot: currentProduct.sku,
          productImageSnapshot: primaryImage,
          unitPricePaise: currentProduct.pricePaise,
          unitMrpPaise: currentProduct.mrpPaise,
          quantity: item.quantity,
          lineTotalPaise,
        });

        stockTransitions.push({
          productId: currentProduct.id,
          quantity: item.quantity,
          previousStock: currentProduct.stockQuantity,
          newStock: currentProduct.stockQuantity - item.quantity,
        });
      }

      // 4. Re-validate applied coupon on the server and increment usedCount
      let couponId: string | null = null;
      let couponCodeSnapshot: string | null = null;
      let discountPaise = 0;

      if (cart.appliedCoupon) {
        const validation = await couponService.validateAndCalculateDiscount(
          cart.appliedCoupon.code,
          subtotalPaise,
          userId,
          tx
        );

        if (cart.appliedCoupon.usageLimit !== null) {
          const couponUpdate = await tx.coupon.updateMany({
            where: {
              id: validation.coupon.id,
              isActive: true,
              usedCount: { lt: cart.appliedCoupon.usageLimit },
            },
            data: {
              usedCount: { increment: 1 },
            },
          });

          if (couponUpdate.count === 0) {
            throw new AppError(
              `Coupon "${validation.coupon.code}" has reached its usage limit`,
              400,
              'COUPON_USAGE_LIMIT_REACHED'
            );
          }
        } else {
          await tx.coupon.update({
            where: { id: validation.coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }

        couponId = validation.coupon.id;
        couponCodeSnapshot = validation.coupon.code;
        discountPaise = validation.discountPaise;
      }

      // 5. Calculate final order totals in integer paise
      const totals = calculateOrderTotalsPaise(subtotalPaise, discountPaise);
      const orderNumber = generateOrderNumber();
      const providerOrderId = `${input.paymentProvider.toLowerCase()}_ord_${crypto.randomBytes(8).toString('hex')}`;

      // 6. Create the Order, OrderItems, and initial Payment record
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          couponId,
          couponCodeSnapshot,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          subtotalPaise: totals.subtotalPaise,
          discountPaise: totals.discountPaise,
          shippingPaise: totals.shippingPaise,
          taxPaise: totals.taxPaise,
          totalPaise: totals.totalPaise,
          currency: 'INR',
          shippingRecipientName: address.recipientName,
          shippingPhone: address.phone,
          shippingLine1: address.line1,
          shippingLine2: address.line2,
          shippingLandmark: address.landmark,
          shippingCity: address.city,
          shippingState: address.state,
          shippingPostalCode: address.postalCode,
          shippingCountry: address.country,
          notes: input.notes ?? null,
          items: {
            create: orderItemsData,
          },
          payments: {
            create: {
              provider: input.paymentProvider,
              status: PaymentStatus.PENDING,
              amountPaise: totals.totalPaise,
              currency: 'INR',
              providerOrderId,
            },
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // 7. Record InventoryLog entries for audit trail
      for (const transition of stockTransitions) {
        await tx.inventoryLog.create({
          data: {
            productId: transition.productId,
            actorUserId: userId,
            orderId: order.id,
            changeQuantity: -transition.quantity,
            previousStock: transition.previousStock,
            newStock: transition.newStock,
            reason: 'ORDER_RESERVED',
            notes: `Reserved ${transition.quantity} unit(s) for order ${order.orderNumber}`,
          },
        });
      }

      // 8. Clear the customer's cart
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: { appliedCouponId: null },
      });

      return order;
    });
  }

  /**
   * Lists orders belonging to the authenticated user with pagination.
   */
  public static async listUserOrders(userId: string, query: ListOrdersQueryInput) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status ? { status } : {}),
    };

    const [orders, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      orders,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Retrieves a single order by ID, enforcing strict ownership (owner or ADMIN).
   */
  public static async getOrderById(orderId: string, requesterId: string, requesterRole: Role) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (order.userId !== requesterId && requesterRole !== Role.ADMIN) {
      throw new AppError(
        'You do not have permission to view this order',
        403,
        'FORBIDDEN_RESOURCE'
      );
    }

    return order;
  }

  /**
   * Cancels an order if it is in a cancellable status (PENDING, CONFIRMED, PROCESSING),
   * restores product inventory atomically, logs InventoryLog, and updates payment status.
   */
  public static async cancelOrder(
    orderId: string,
    requesterId: string,
    requesterRole: Role,
    input: CancelOrderInput
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
      }

      if (order.userId !== requesterId && requesterRole !== Role.ADMIN) {
        throw new AppError(
          'You do not have permission to cancel this order',
          403,
          'FORBIDDEN_RESOURCE'
        );
      }

      const cancellableStatuses: OrderStatus[] = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
      ];

      if (!cancellableStatuses.includes(order.status)) {
        throw new AppError(
          `Order cannot be cancelled once its status is ${order.status}`,
          400,
          'ORDER_NOT_CANCELLABLE'
        );
      }

      // 1. Restore product stock and write InventoryLog for each item
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const updatedProduct = await tx.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: { increment: item.quantity },
            },
          });

          await tx.inventoryLog.create({
            data: {
              productId: product.id,
              actorUserId: requesterId,
              orderId: order.id,
              changeQuantity: item.quantity,
              previousStock: product.stockQuantity,
              newStock: updatedProduct.stockQuantity,
              reason: 'ORDER_CANCELLED',
              notes: `Restored ${item.quantity} unit(s) from cancelled order ${order.orderNumber}`,
            },
          });
        }
      }

      // 2. Decrement coupon usedCount if a coupon was applied
      if (order.couponId) {
        await tx.coupon.updateMany({
          where: {
            id: order.couponId,
            usedCount: { gt: 0 },
          },
          data: {
            usedCount: { decrement: 1 },
          },
        });
      }

      // 3. Determine updated payment status
      const newPaymentStatus =
        order.paymentStatus === PaymentStatus.PAID
          ? PaymentStatus.REFUNDED
          : PaymentStatus.FAILED;

      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: newPaymentStatus,
          failureReason:
            newPaymentStatus === PaymentStatus.FAILED ? 'Order cancelled before payment' : null,
        },
      });

      // 4. Update the Order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: newPaymentStatus,
          cancellationReason: input.reason,
          cancelledAt: new Date(),
        },
        include: {
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updatedOrder;
    });
  }
}
