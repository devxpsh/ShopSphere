import { DiscountType } from '@prisma/client';
import { z } from 'zod';

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2, 'Coupon code is required').max(50),
    subtotalPaise: z.number().int().min(0).optional(),
  }),
});

export const createCouponSchema = z.object({
  body: z.object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .transform((v) => v.toUpperCase()),
    description: z.string().trim().max(255).optional().nullable(),
    discountType: z.nativeEnum(DiscountType),
    discountValue: z.number().int().positive(),
    minOrderPaise: z.number().int().min(0).default(0),
    maxDiscountPaise: z.number().int().positive().optional().nullable(),
    usageLimit: z.number().int().positive().optional().nullable(),
    perUserLimit: z.number().int().positive().default(1),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime(),
    isActive: z.boolean().default(true),
  }),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>['body'];
export type CreateCouponInput = z.infer<typeof createCouponSchema>['body'];
