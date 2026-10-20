import { InventoryReason } from '@prisma/client';
import { z } from 'zod';

export const productImageInputSchema = z.object({
  url: z.string().trim().url('Must be a valid image URL').max(500),
  altText: z.string().trim().max(255).optional().nullable(),
  displayOrder: z.number().int().min(0).optional().default(0),
  isPrimary: z.boolean().optional().default(false),
});

const baseProductSchema = z.object({
  categoryId: z.string().uuid('Invalid category UUID'),
  sku: z
    .string()
    .trim()
    .min(3, 'SKU must be at least 3 characters')
    .max(64)
    .transform((val) => val.toUpperCase()),
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(220)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  brand: z.string().trim().max(100).nullable().optional(),
  pricePaise: z
    .number()
    .int('Price must be an integer in paise')
    .positive('Price in paise must be greater than 0'),
  mrpPaise: z
    .number()
    .int('MRP must be an integer in paise')
    .positive('MRP in paise must be greater than 0'),
  stockQuantity: z
    .number()
    .int('Stock quantity must be an integer')
    .min(0, 'Stock quantity cannot be negative')
    .optional()
    .default(0),
  lowStockThreshold: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(5),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  specifications: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .nullable()
    .optional(),
  images: z.array(productImageInputSchema).max(10).optional(),
});

export const createProductSchema = baseProductSchema.refine(
  (data) => data.mrpPaise >= data.pricePaise,
  {
    message: 'MRP (mrpPaise) must be greater than or equal to selling price (pricePaise)',
    path: ['mrpPaise'],
  }
);

export const updateProductSchema = baseProductSchema
  .omit({ stockQuantity: true })
  .partial()
  .refine(
    (data) => {
      if (data.mrpPaise !== undefined && data.pricePaise !== undefined) {
        return data.mrpPaise >= data.pricePaise;
      }
      return true;
    },
    {
      message: 'MRP (mrpPaise) must be greater than or equal to selling price (pricePaise)',
      path: ['mrpPaise'],
    }
  );

export const adjustInventorySchema = z.object({
  changeQuantity: z
    .number()
    .int('Change quantity must be an integer')
    .refine((val) => val !== 0, 'Change quantity cannot be zero'),
  reason: z.nativeEnum(InventoryReason).default(InventoryReason.ADMIN_ADJUSTMENT),
  notes: z.string().trim().max(500).optional(),
});

export const productListQuerySchema = z.object({
  q: z.string().trim().optional(),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  minPricePaise: z.coerce.number().int().min(0).optional(),
  maxPricePaise: z.coerce.number().int().min(0).optional(),
  inStock: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  sortBy: z
    .enum(['newest', 'price_asc', 'price_desc', 'rating_desc', 'name_asc'])
    .optional()
    .default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product UUID'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
