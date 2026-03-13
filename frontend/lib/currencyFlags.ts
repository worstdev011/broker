const CURRENCY_TO_COUNTRY: Record<string, string> = {
  EUR: 'EU',
  USD: 'US',
  GBP: 'GB',
  JPY: 'JP',
  AUD: 'AU',
  CAD: 'CA',
  CHF: 'CH',
  NZD: 'NZ',
  NOK: 'NO',
  UAH: 'UA',
  BTC: 'US',
  ETH: 'US',
  SOL: 'US',
  BNB: 'US',
};

/**
 * Splits a pair like "EUR/USD" into two ISO 3166-1 alpha-2 country codes
 * for use with flag icons.
 */
export function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  const parts = pair.split('/');
  if (parts.length !== 2) return [null, null];
  const [base, quote] = parts;
  return [
    CURRENCY_TO_COUNTRY[base] ?? null,
    CURRENCY_TO_COUNTRY[quote] ?? null,
  ];
}
