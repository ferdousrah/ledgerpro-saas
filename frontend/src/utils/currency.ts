/**
 * Currency formatting utilities
 */

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  BDT: '৳',
  PKR: '₨',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  MYR: 'RM',
  THB: '฿',
  KRW: '₩',
  RUB: '₽',
  ZAR: 'R',
  BRL: 'R$',
  MXN: '$',
  AED: 'د.إ',
  SAR: '﷼',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
};

// Currencies where symbol appears AFTER the amount
const SUFFIX_CURRENCIES = new Set([
  'BDT',  // Bangladesh: 100 ৳
  'AED',  // UAE: 100 د.إ
  'SAR',  // Saudi Arabia: 100 ﷼
  'CHF',  // Switzerland: 100 CHF
  'SEK',  // Sweden: 100 kr
  'NOK',  // Norway: 100 kr
  'DKK',  // Denmark: 100 kr
]);

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number | string, currencyCode: string = 'USD'): string {
  const code = currencyCode.toUpperCase();
  const symbol = getCurrencySymbol(code);
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formattedAmount = (numericAmount || 0).toFixed(2);

  // Check if currency symbol should appear after the amount
  if (SUFFIX_CURRENCIES.has(code)) {
    return `${formattedAmount} ${symbol}`;
  } else {
    return `${symbol}${formattedAmount}`;
  }
}

/**
 * Format amount with currency symbol (supports negative values with color)
 */
export function formatCurrencyWithSign(amount: number | string, currencyCode: string = 'USD'): { text: string; isNegative: boolean } {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const isNegative = numericAmount < 0;
  const absAmount = Math.abs(numericAmount);
  const formatted = formatCurrency(absAmount, currencyCode);

  return {
    text: isNegative ? `-${formatted}` : formatted,
    isNegative
  };
}

/**
 * Format currency for PDF (uses currency code instead of symbol for non-ASCII currencies)
 * This avoids Unicode rendering issues in PDF fonts
 */
export function formatCurrencyForPDF(amount: number | string, currencyCode: string = 'USD'): string {
  const code = currencyCode.toUpperCase();
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formattedAmount = (numericAmount || 0).toFixed(2);

  // Currencies that work well with standard PDF fonts (ASCII-safe)
  const SAFE_CURRENCIES = new Set(['USD', 'EUR', 'GBP']);

  if (SAFE_CURRENCIES.has(code)) {
    const symbol = getCurrencySymbol(code);
    if (SUFFIX_CURRENCIES.has(code)) {
      return `${formattedAmount} ${symbol}`;
    } else {
      return `${symbol}${formattedAmount}`;
    }
  } else {
    // Use currency code instead of symbol for non-ASCII currencies
    return `${code} ${formattedAmount}`;
  }
}
