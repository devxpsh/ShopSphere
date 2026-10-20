import { DiscountType, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import {
  calculatePercentageDiscountPaise,
  formatPaiseToINR,
} from '../../utils/currency';
import { CreateCouponInput } from './coupon.validation';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface ValidatedCouponResult {
  coupon: {
    id: string;
    code: string;
    description: string | null;
    discountType: DiscountType;
    discountValue: number;
    minOrderPaise: number;
    maxDiscountPaise: number | null;
  };
  discountPaise: number;
}

export class CouponService {
  async listActiveCoupons() {
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
      },
      orderBy: { minOrderPaise: 'asc' },
      select: {
        id: true,
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minOrderPaise: true,
        maxDiscountPaise: true,
        expiresAt: true,
      },
    });
    return coupons;
  }

  async validateAndCalculateDiscount(
    rawCode: string,
    subtotalPaise: number,
    userId: string,
    db: DbClient = prisma
  ): Promise<ValidatedCouponResult> {
    const code = rawCode.trim().toUpperCase();
    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError(
        `Invalid or inactive coupon code "${code}".`,
        400,
        'INVALID_COUPON'
      );
    }

    const now = new Date();
    if (now < coupon.startsAt) {
      throw new AppError(
        `Coupon "${code}" is not active yet.`,
        400,
        'COUPON_NOT_STARTED'
      );
    }

    if (now > coupon.expiresAt) {
      throw new AppError(
        `Coupon "${code}" has expired.`,
        400,
        'COUPON_EXPIRED'
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(
        `Coupon "${code}" has reached its maximum usage limit.`,
        400,
        'COUPON_USAGE_LIMIT_REACHED'
      );
    }

    // Check per-user usage limit against non-cancelled orders
    const userUsageCount = await db.order.count({
      where: {
        userId,
        couponId: coupon.id,
        status: { not: OrderStatus.CANCELLED },
      },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new AppError(
        `You have already used coupon "${code}" the maximum allowed number of times (${coupon.perUserLimit}).`,
        400,
        'COUPON_PER_USER_LIMIT_REACHED'
      );
    }

    if (subtotalPaise < coupon.minOrderPaise) {
      throw new AppError(
        `Coupon "${code}" requires a minimum cart subtotal of ${formatPaiseToINR(
          coupon.minOrderPaise
        )}.`,
        400,
        'COUPON_MIN_ORDER_NOT_MET'
      );
    }

    let discountPaise = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountPaise = calculatePercentageDiscountPaise(
        subtotalPaise,
        coupon.discountValue,
        coupon.maxDiscountPaise
      );
    } else {
      discountPaise = Math.min(coupon.discountValue, subtotalPaise);
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderPaise: coupon.minOrderPaise,
        maxDiscountPaise: coupon.maxDiscountPaise,
      },
      discountPaise,
    };
  }

  async createCoupon(input: CreateCouponInput) {
    const existing = await prisma.coupon.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw new AppError(
        `Coupon code "${input.code}" already exists.`,
        409,
        'COUPON_CODE_EXISTS'
      );
    }

    if (
      input.discountType === DiscountType.PERCENTAGE &&
      input.discountValue > 100
    ) {
      throw new AppError(
        'Percentage discount cannot exceed 100%.',
        400,
        'INVALID_COUPON_VALUE'
      );
    }

    return prisma.coupon.create({
      data: {
        code: input.code,
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderPaise: input.minOrderPaise ?? 0,
        maxDiscountPaise: input.maxDiscountPaise ?? null,
        usageLimit: input.usageLimit ?? null,
        perUserLimit: input.perUserLimit ?? 1,
        startsAt: input.startsAt ? new Date(input.startsAt) : new Date(),
        expiresAt: new Date(input.expiresAt),
        isActive: input.isActive ?? true,
      },
    });
  }
}

export const couponService = new CouponService();
