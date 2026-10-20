const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Converts integer paise from the backend into a formatted Indian Rupee string.
 * Security Rule #1: Monetary values are stored as integer paise and converted to Rupees only for display.
 * Example: 149900 -> "₹1,499.00" (or "₹1,499" if wholeRupeesOnly is true and paise is divisible by 100)
 */
export function formatPaiseToINR(
  amountPaise: number,
  options?: { trimZeroPaise?: boolean }
): string {
  if (!Number.isFinite(amountPaise)) {
    return '₹0.00';
  }
  const rupees = amountPaise / 100;
  if (options?.trimZeroPaise && amountPaise % 100 === 0) {
    return inrWholeFormatter.format(rupees);
  }
  return inrFormatter.format(rupees);
}

/**
 * Converts a user-entered Rupee amount (e.g. in a price filter input) into integer paise.
 */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    return 0;
  }
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise into a numeric Rupee value (e.g. for chart axes).
 */
export function paiseToRupees(amountPaise: number): number {
  if (!Number.isFinite(amountPaise)) {
    return 0;
  }
  return Math.round(amountPaise) / 100;
}

/**
 * Calculates integer percentage discount between MRP (paise) and Selling Price (paise).
 */
export function calculateDiscountPercent(
  pricePaise: number,
  mrpPaise: number
): number {
  if (mrpPaise <= 0 || pricePaise >= mrpPaise) {
    return 0;
  }
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}
