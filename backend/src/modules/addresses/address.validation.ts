import { z } from 'zod';

const indianPhoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
const indianPinCodeRegex = /^[1-9][0-9]{5}$/;

export const createAddressSchema = z.object({
  body: z.object({
    label: z.string().trim().min(1).max(50).default('Home'),
    recipientName: z
      .string()
      .trim()
      .min(2, 'Recipient name must be at least 2 characters')
      .max(120),
    phone: z
      .string()
      .trim()
      .regex(
        indianPhoneRegex,
        'Phone must be a valid 10-digit Indian mobile number'
      ),
    line1: z
      .string()
      .trim()
      .min(5, 'Address line 1 must be at least 5 characters')
      .max(255),
    line2: z.string().trim().max(255).optional().nullable(),
    landmark: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(2, 'City is required').max(100),
    state: z.string().trim().min(2, 'State is required').max(100),
    postalCode: z
      .string()
      .trim()
      .regex(
        indianPinCodeRegex,
        'Postal code must be a valid 6-digit Indian PIN code (e.g., 560001)'
      ),
    country: z.string().trim().length(2).default('IN'),
    isDefault: z.boolean().optional().default(false),
  }),
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid address ID'),
  }),
  body: createAddressSchema.shape.body.partial(),
});

export const addressIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid address ID'),
  }),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>['body'];
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>['body'];
