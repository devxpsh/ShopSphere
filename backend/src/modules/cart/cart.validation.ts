import { z } from 'zod';

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20).default(1),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
  body: z.object({
    quantity: z.number().int().min(0, 'Quantity cannot be negative').max(999),
  }),
});

export const cartProductParamSchema = z.object({
  params: z.object({
    productId: z.string().uuid('Invalid product ID'),
  }),
});

export const applyCartCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(2, 'Coupon code is required').max(50),
  }),
});

export const mergeGuestCartSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Invalid product ID'),
          quantity: z.number().int().min(1).max(20),
        })
      )
      .max(50),
  }),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>['body'];
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>['body'];
export type ApplyCartCouponInput = z.infer<typeof applyCartCouponSchema>['body'];
export type MergeGuestCartInput = z.infer<typeof mergeGuestCartSchema>['body'];
