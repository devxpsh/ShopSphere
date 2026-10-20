import { z } from 'zod';

export const mockPaymentVerifySchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  outcome: z.enum(['SUCCESS', 'FAILURE']).default('SUCCESS'),
  method: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET']).default('UPI'),
});

export const razorpayCreateOrderSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
});

export const razorpayVerifyPaymentSchema = z.object({
  orderId: z.string().uuid('Valid order ID is required'),
  razorpayOrderId: z.string().trim().min(5, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().trim().min(5, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().trim().min(16, 'Razorpay signature is required'),
  method: z.string().trim().max(50).optional().default('RAZORPAY'),
});

export type MockPaymentVerifyInput = z.infer<typeof mockPaymentVerifySchema>;
export type RazorpayCreateOrderInput = z.infer<typeof razorpayCreateOrderSchema>;
export type RazorpayVerifyPaymentInput = z.infer<typeof razorpayVerifyPaymentSchema>;
