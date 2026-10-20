import { z } from 'zod';

const indianPhoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .max(255)
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100, 'Password cannot exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(120, 'Full name cannot exceed 120 characters'),
  phone: z
    .string()
    .trim()
    .regex(indianPhoneRegex, 'Please provide a valid 10-digit Indian mobile number')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(120)
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(indianPhoneRegex, 'Please provide a valid 10-digit Indian mobile number')
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    currentPassword: z.string().min(1).optional(),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(100)
      .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'New password must contain at least one number')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: 'Current password is required when setting a new password',
      path: ['currentPassword'],
    }
  );

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
