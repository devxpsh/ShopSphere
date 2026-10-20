import {
  DiscountType,
  OrderStatus,
  PaymentStatus,
  ReviewStatus,
} from '@prisma/client';
import { z } from 'zod';

export const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  search: z.string().trim().max(120).optional(),
});

export const adminOrderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  cancellationReason: z.string().trim().min(3).max(500).optional(),
});

export const adminInventoryLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  productId: z.string().uuid().optional(),
});

export const adminCouponIdParamSchema = z.object({
  id: z.string().uuid('Invalid coupon ID'),
});

export const createAdminCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, 'Coupon code may only contain letters, numbers, hyphens, and underscores')
    .transform((v) => v.toUpperCase()),
  description: z.string().trim().max(240).optional().nullable(),
  discountType: z.nativeEnum(DiscountType),
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().min(0).default(0),
  maxDiscountPaise: z.number().int().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().default(1),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});

export const updateAdminCouponSchema = z.object({
  description: z.string().trim().max(240).optional().nullable(),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.number().int().positive().optional(),
  minOrderPaise: z.number().int().min(0).optional(),
  maxDiscountPaise: z.number().int().positive().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().optional(),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const adminReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(ReviewStatus).optional(),
  productId: z.string().uuid().optional(),
});

export const adminReviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review ID'),
});

export const moderateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  adminNotes: z.string().trim().max(500).optional().nullable(),
});

export type AdminOrdersQueryInput = z.infer<typeof adminOrdersQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AdminInventoryLogsQueryInput = z.infer<typeof adminInventoryLogsQuerySchema>;
export type CreateAdminCouponInput = z.infer<typeof createAdminCouponSchema>;
export type UpdateAdminCouponInput = z.infer<typeof updateAdminCouponSchema>;
export type AdminReviewsQueryInput = z.infer<typeof adminReviewsQuerySchema>;
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
