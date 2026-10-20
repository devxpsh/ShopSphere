import {
  DiscountType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ReviewStatus,
  Role,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { couponService } from '../coupons/coupon.service';
import { OrderService } from '../orders/order.service';
import { recalculateProductRatingStats } from '../reviews/review.service';
import {
  AdminInventoryLogsQueryInput,
  AdminOrdersQueryInput,
  AdminReviewsQueryInput,
  CreateAdminCouponInput,
  ModerateReviewInput,
  UpdateAdminCouponInput,
  UpdateOrderStatusInput,
} from './admin.schemas';

export class AdminService {
  /**
   * Computes real-data e-commerce analytics exclusively from PostgreSQL records.
   * Mandatory Security Rule #11: Never fabricate customers, testimonials, sales, ratings, or analytics.
   */
  public static async getDashboardAnalytics() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 13);
    fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [
      paidOrdersAggregate,
      totalOrders,
      totalCustomers,
      totalProducts,
      activeProducts,
      allProductsForStockCheck,
      pendingReviewsCount,
      activeCouponsCount,
      ordersGroupedByStatus,
      recentValidOrders,
      nonCancelledOrderItems,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          paymentStatus: PaymentStatus.PAID,
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: {
          totalPaise: true,
        },
        _count: {
          id: true,
        },
      }),
      prisma.order.count(),
      prisma.user.count({
        where: { role: Role.CUSTOMER },
      }),
      prisma.product.count(),
      prisma.product.count({
        where: { isActive: true },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          sku: true,
          name: true,
          slug: true,
          stockQuantity: true,
          lowStockThreshold: true,
          pricePaise: true,
          isActive: true,
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      prisma.review.count({
        where: { status: ReviewStatus.PENDING },
      }),
      prisma.coupon.count({
        where: {
          isActive: true,
          expiresAt: { gte: now },
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalPaise: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: fourteenDaysAgo },
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          totalPaise: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: OrderStatus.CANCELLED },
          },
        },
        select: {
          productId: true,
          productNameSnapshot: true,
          productSkuSnapshot: true,
          quantity: true,
          lineTotalPaise: true,
          product: {
            select: {
              id: true,
              stockQuantity: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const totalRevenuePaise = paidOrdersAggregate._sum.totalPaise ?? 0;
    const paidOrdersCount = paidOrdersAggregate._count.id;
    const averageOrderValuePaise =
      paidOrdersCount > 0 ? Math.round(totalRevenuePaise / paidOrdersCount) : 0;

    // Low stock products derived from actual stockQuantity <= lowStockThreshold
    const lowStockAlerts = allProductsForStockCheck
      .filter((p) => p.stockQuantity <= p.lowStockThreshold)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        slug: p.slug,
        categoryName: p.category.name,
        stockQuantity: p.stockQuantity,
        lowStockThreshold: p.lowStockThreshold,
        pricePaise: p.pricePaise,
        isActive: p.isActive,
      }));

    const lowStockProductsCount = allProductsForStockCheck.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold
    ).length;

    // Orders by status (all 6 OrderStatus enum values represented)
    const allStatuses: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ];

    const statusMap = new Map(
      ordersGroupedByStatus.map((g) => [
        g.status,
        {
          count: g._count.id,
          totalPaise: g._sum.totalPaise ?? 0,
        },
      ])
    );

    const ordersByStatus = allStatuses.map((status) => ({
      status,
      count: statusMap.get(status)?.count ?? 0,
      totalPaise: statusMap.get(status)?.totalPaise ?? 0,
    }));

    // Revenue and units sold by category (from non-cancelled OrderItems)
    const categoryStatsMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        unitsSold: number;
        revenuePaise: number;
      }
    >();

    // Top-selling products aggregation (from non-cancelled OrderItems)
    const productSalesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        sku: string;
        categoryName: string;
        unitsSold: number;
        revenuePaise: number;
        stockQuantity: number;
      }
    >();

    for (const item of nonCancelledOrderItems) {
      const catId = item.product?.category?.id ?? 'uncategorized';
      const catName = item.product?.category?.name ?? 'Uncategorized';

      const existingCat = categoryStatsMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        unitsSold: 0,
        revenuePaise: 0,
      };
      existingCat.unitsSold += item.quantity;
      existingCat.revenuePaise += item.lineTotalPaise;
      categoryStatsMap.set(catId, existingCat);

      const existingProd = productSalesMap.get(item.productId) ?? {
        productId: item.productId,
        name: item.productNameSnapshot,
        sku: item.productSkuSnapshot,
        categoryName: catName,
        unitsSold: 0,
        revenuePaise: 0,
        stockQuantity: item.product?.stockQuantity ?? 0,
      };
      existingProd.unitsSold += item.quantity;
      existingProd.revenuePaise += item.lineTotalPaise;
      productSalesMap.set(item.productId, existingProd);
    }

    const revenueByCategory = Array.from(categoryStatsMap.values()).sort(
      (a, b) => b.revenuePaise - a.revenuePaise
    );

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 6);

    // 14-day daily time-series (YYYY-MM-DD) derived from actual Order records
    const dailyMap = new Map<
      string,
      {
        date: string;
        label: string;
        revenuePaise: number;
        orderCount: number;
      }
    >();

    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setUTCDate(fourteenDaysAgo.getUTCDate() + i);
      const isoDate = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
      dailyMap.set(isoDate, {
        date: isoDate,
        label,
        revenuePaise: 0,
        orderCount: 0,
      });
    }

    for (const ord of recentValidOrders) {
      const isoDate = ord.createdAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(isoDate);
      if (bucket) {
        bucket.orderCount += 1;
        if (
          ord.paymentStatus === PaymentStatus.PAID &&
          ord.status !== OrderStatus.CANCELLED
        ) {
          bucket.revenuePaise += ord.totalPaise;
        }
      }
    }

    const revenueTimeSeries = Array.from(dailyMap.values());

    return {
      kpis: {
        totalRevenuePaise,
        totalOrders,
        paidOrdersCount,
        averageOrderValuePaise,
        totalCustomers,
        totalProducts,
        activeProducts,
        lowStockProductsCount,
        pendingReviewsCount,
        activeCouponsCount,
      },
      ordersByStatus,
      revenueByCategory,
      revenueTimeSeries,
      topSellingProducts,
      lowStockAlerts,
    };
  }

  /**
   * Lists all orders across all customers for Admin management.
   */
  public static async listAllOrders(query: AdminOrdersQueryInput) {
    const { page, limit, status, paymentStatus, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { shippingRecipientName: { contains: search, mode: 'insensitive' } },
        { shippingCity: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, totalItems] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            },
          },
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
   * Updates an order's lifecycle status (and optionally paymentStatus).
   * If transitioning to CANCELLED, delegates to OrderService.cancelOrder so reserved stock
   * is atomically restored and logged in InventoryLog.
   */
  public static async updateOrderStatus(
    orderId: string,
    adminUserId: string,
    input: UpdateOrderStatusInput
  ) {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!existing) {
      throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (existing.status === OrderStatus.CANCELLED) {
      throw new AppError(
        'Cancelled orders cannot be transitioned to another status.',
        400,
        'INVALID_ORDER_TRANSITION'
      );
    }

    if (
      existing.status === OrderStatus.DELIVERED &&
      input.status !== OrderStatus.DELIVERED
    ) {
      throw new AppError(
        'Delivered orders cannot be reverted to an earlier status.',
        400,
        'INVALID_ORDER_TRANSITION'
      );
    }

    // If Admin cancels the order, execute atomic stock restoration via OrderService.cancelOrder
    if (input.status === OrderStatus.CANCELLED) {
      const cancelled = await OrderService.cancelOrder(
        orderId,
        adminUserId,
        Role.ADMIN,
        {
          reason:
            input.cancellationReason ||
            'Cancelled by administrator via Admin Dashboard',
        }
      );
      return cancelled;
    }

    return prisma.$transaction(async (tx) => {
      const nextPaymentStatus =
        input.paymentStatus ??
        (input.status === OrderStatus.DELIVERED &&
        existing.paymentStatus === PaymentStatus.PENDING
          ? PaymentStatus.PAID
          : existing.paymentStatus);

      const deliveredAt =
        input.status === OrderStatus.DELIVERED
          ? existing.deliveredAt ?? new Date()
          : existing.deliveredAt;

      if (nextPaymentStatus !== existing.paymentStatus) {
        await tx.payment.updateMany({
          where: { orderId: existing.id },
          data: {
            status: nextPaymentStatus,
            paidAt:
              nextPaymentStatus === PaymentStatus.PAID ? new Date() : undefined,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          paymentStatus: nextPaymentStatus,
          deliveredAt,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
            },
          },
          items: true,
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Lists paginated InventoryLog audit entries for Admin oversight.
   */
  public static async listInventoryLogs(query: AdminInventoryLogsQueryInput) {
    const { page, limit, productId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryLogWhereInput = {
      ...(productId ? { productId } : {}),
    };

    const [logs, totalItems] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              slug: true,
              stockQuantity: true,
            },
          },
          actorUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inventoryLog.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      logs,
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
   * Lists all coupons (active, inactive, and expired) for Admin management.
   */
  public static async listAllCoupons() {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    return coupons.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderPaise: c.minOrderPaise,
      maxDiscountPaise: c.maxDiscountPaise,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      usedCount: c.usedCount,
      orderRedemptionsCount: c._count.orders,
      startsAt: c.startsAt,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  public static async createCoupon(input: CreateAdminCouponInput) {
    return couponService.createCoupon(input);
  }

  public static async updateCoupon(id: string, input: UpdateAdminCouponInput) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    const nextDiscountType = input.discountType ?? existing.discountType;
    const nextDiscountValue = input.discountValue ?? existing.discountValue;

    if (
      nextDiscountType === DiscountType.PERCENTAGE &&
      nextDiscountValue > 100
    ) {
      throw new AppError(
        'Percentage discount cannot exceed 100%.',
        400,
        'INVALID_COUPON_VALUE'
      );
    }

    return prisma.coupon.update({
      where: { id },
      data: {
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.discountType !== undefined
          ? { discountType: input.discountType }
          : {}),
        ...(input.discountValue !== undefined
          ? { discountValue: input.discountValue }
          : {}),
        ...(input.minOrderPaise !== undefined
          ? { minOrderPaise: input.minOrderPaise }
          : {}),
        ...(input.maxDiscountPaise !== undefined
          ? { maxDiscountPaise: input.maxDiscountPaise }
          : {}),
        ...(input.usageLimit !== undefined
          ? { usageLimit: input.usageLimit }
          : {}),
        ...(input.perUserLimit !== undefined
          ? { perUserLimit: input.perUserLimit }
          : {}),
        ...(input.startsAt !== undefined
          ? { startsAt: new Date(input.startsAt) }
          : {}),
        ...(input.expiresAt !== undefined
          ? { expiresAt: new Date(input.expiresAt) }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  public static async deleteCoupon(id: string) {
    const existing = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    // Preserve historical accounting integrity: soft-deactivate if used on orders
    if (existing._count.orders > 0 || existing.usedCount > 0) {
      const deactivated = await prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        action: 'DEACTIVATED' as const,
        coupon: deactivated,
      };
    }

    await prisma.coupon.delete({ where: { id } });
    return {
      action: 'DELETED' as const,
      coupon: existing,
    };
  }

  /**
   * Lists customer reviews across all products for Admin moderation.
   */
  public static async listAllReviews(query: AdminReviewsQueryInput) {
    const { page, limit, status, productId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      ...(status ? { status } : {}),
      ...(productId ? { productId } : {}),
    };

    const [reviews, totalItems] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    return {
      reviews,
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
   * Moderates a review (APPROVED / REJECTED / PENDING) and recalculates
   * the associated product's averageRating and reviewCount from approved reviews.
   */
  public static async moderateReview(
    reviewId: string,
    input: ModerateReviewInput
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.review.findUnique({
        where: { id: reviewId },
      });

      if (!existing) {
        throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
      }

      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          status: input.status,
          adminNotes: input.adminNotes ?? existing.adminNotes,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      const productRatingStats = await recalculateProductRatingStats(
        existing.productId,
        tx
      );

      return {
        review: updatedReview,
        productRatingStats,
      };
    });
  }
}
