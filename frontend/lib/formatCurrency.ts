/**
 * Shared currency formatting.
 * Maps currency codes to display symbols/labels.
 */
export function formatCurrencySymbol(code: string): string {
  switch (code) {
    case 'RUB':
      return '₽';
    case 'USD':
    case 'UAH':
      return code;
    default:
      return code;
  }
}

export function getCurrencyIcon(code: string): string {
  switch (code) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'RUB': return '₽';
    case 'UAH': return '₴';
    case 'KZT': return '₸';
    case 'BYN': return 'Br';
    case 'TRY': return '₺';
    case 'JPY': return '¥';
    case 'CNY': return '¥';
    case 'INR': return '₹';
    default:    return code;
  }
}

/** Whole amount with grouped thousands (e.g. 12,345.67) — for header / account UI. */
const balanceGroupingFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGroupedBalanceAmount(value: number): string {
  if (!Number.isFinite(value)) return '0.00';
  return balanceGroupingFormatter.format(value);
}

/**
 * Format a numeric balance with its currency symbol.
 * Example: formatBalance(1234.5, 'RUB') => '1234.50 ₽'
 */
export function formatBalance(value: number, currency: string): string {
  return `${value.toFixed(2)} ${formatCurrencySymbol(currency)}`;
}

/** Amount with symbol or "12.34 XXX" for unknown 3-letter codes (trade UI, chart labels). */
export function formatTradeAmountLabel(value: string | number, currency: string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  const fixed = Number.isFinite(n) ? n.toFixed(2) : String(value);
  const sym = getCurrencyIcon(currency);
  if (sym === currency && currency.length === 3) {
    return `${fixed} ${currency}`;
  }
  return `${sym}${fixed}`;
}

/** Signed PnL for compact chart badges, e.g. +₴1.00, -12.34 UAH */
export function formatSignedTradeAmount(pnl: number, currency: string): string {
  const fixed = Math.abs(pnl).toFixed(2);
  const sym = getCurrencyIcon(currency);
  const body =
    sym === currency && currency.length === 3 ? `${fixed} ${currency}` : `${sym}${fixed}`;
  if (pnl > 0) return `+${body}`;
  if (pnl < 0) return `-${body}`;
  return body;
}

/** Compact “+amount” for overlays (open trade: pass profit only, not stake+profit). */
export function formatPayoutTotalLabel(total: number, currency: string): string {
  const grouped = formatGroupedBalanceAmount(total);
  const sym = getCurrencyIcon(currency);
  if (sym === currency && currency.length === 3) {
    return `+${grouped} ${currency}`;
  }
  return `+${sym}${grouped}`;
}

export function formatPayoutMissingLabel(currency: string): string {
  const sym = getCurrencyIcon(currency);
  if (sym === currency && currency.length === 3) {
    return `- ${currency}`;
  }
  return `-${sym}`;
}
