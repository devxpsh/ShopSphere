import { AppError } from './AppError';

/**
 * Asserts that a monetary value is a valid non-negative safe integer in paise.
 * Security Rule #1: All monetary amounts must be stored and calculated as integer paise.
 */
export function assertValidPaise(amountPaise: number, fieldName = 'amountPaise'): void {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new AppError(
      `Invalid monetary value for ${fieldName}: must be a non-negative integer in paise`,
      400,
      'INVALID_MONETARY_AMOUNT'
    );
  }
}

/**
 * Formats integer paise into Indian Rupees string (e.g., 149900 -> "₹1,499.00").
 * Used only for human-readable display/receipts, never for database storage.
 */
export function formatPaiseToINR(amountPaise: number): string {
  assertValidPaise(amountPaise);
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Calculates a percentage discount in integer paise using deterministic rounding,
 * capped by an optional maximum discount in paise and never exceeding subtotalPaise.
 */
export function calculatePercentageDiscountPaise(
  subtotalPaise: number,
  percentage: number,
  maxDiscountPaise?: number | null
): number {
  assertValidPaise(subtotalPaise, 'subtotalPaise');
  if (!Number.isSafeInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new AppError(
      'Discount percentage must be an integer between 0 and 100',
      400,
      'INVALID_DISCOUNT_PERCENTAGE'
    );
  }

  let discount = Math.round((subtotalPaise * percentage) / 100);
  if (typeof maxDiscountPaise === 'number' && maxDiscountPaise >= 0) {
    discount = Math.min(discount, maxDiscountPaise);
  }
  return Math.min(discount, subtotalPaise);
}
