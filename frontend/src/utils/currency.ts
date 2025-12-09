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
};

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const symbol = getCurrencySymbol(currencyCode);
  const formattedAmount = amount.toFixed(2);

  // For some currencies like USD, symbol comes before amount
  // For others like EUR, it might come after
  const prefixSymbols = ['$', '£', '¥', '₹', '৳', '₨', 'A$', 'C$', 'S$', 'RM', '฿', '₩', '₽', 'R', 'R$', 'د.إ', '﷼'];

  if (prefixSymbols.includes(symbol)) {
    return `${symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount} ${symbol}`;
  }
}

/**
 * Format amount with currency symbol (supports negative values with color)
 */
export function formatCurrencyWithSign(amount: number, currencyCode: string = 'USD'): { text: string; isNegative: boolean } {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = formatCurrency(absAmount, currencyCode);

  return {
    text: isNegative ? `-${formatted}` : formatted,
    isNegative
  };
}
