import { z } from 'zod';
import { OrderStatus, PaymentProvider } from '@prisma/client';

export const createOrderSchema = z.object({
  addressId: z.string().uuid('Valid shipping address ID is required'),
  paymentProvider: z.nativeEnum(PaymentProvider).default(PaymentProvider.MOCK),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Please provide a brief cancellation reason')
    .max(500)
    .default('Cancelled by customer'),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID'),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.nativeEnum(OrderStatus).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQueryInput = z.infer<typeof listOrdersQuerySchema>;
