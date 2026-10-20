import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().uuid('Valid product ID is required'),
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be between 1 and 5')
    .max(5, 'Rating must be between 1 and 5'),
  title: z.string().trim().max(150, 'Title cannot exceed 150 characters').optional().nullable(),
  comment: z
    .string()
    .trim()
    .min(5, 'Review comment must be at least 5 characters')
    .max(2000, 'Review comment cannot exceed 2000 characters'),
});

export const reviewProductIdParamSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
});

export const reviewIdParamSchema = z.object({
  id: z.string().uuid('Invalid review ID'),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
