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

/**
 * Format a numeric balance with its currency symbol.
 * Example: formatBalance(1234.5, 'RUB') => '1234.50 ₽'
 */
export function formatBalance(value: number, currency: string): string {
  return `${value.toFixed(2)} ${formatCurrencySymbol(currency)}`;
}
