import { z } from 'zod';

export const wishlistItemBodySchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export const wishlistProductIdParamSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export type WishlistItemBody = z.infer<typeof wishlistItemBodySchema>;
