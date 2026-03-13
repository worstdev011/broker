'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Globe, Banknote } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ReactCountryFlag from 'react-country-flag';
import { api } from '@/lib/api/api';

const COUNTRIES = [
  { code: 'UA', name: 'Ukraine', currency: 'UAH' },
  { code: 'US', name: 'United States', currency: 'USD' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'IT', name: 'Italy', currency: 'EUR' },
  { code: 'ES', name: 'Spain', currency: 'EUR' },
  { code: 'PT', name: 'Portugal', currency: 'EUR' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', currency: 'EUR' },
  { code: 'AT', name: 'Austria', currency: 'EUR' },
  { code: 'PL', name: 'Poland', currency: 'PLN' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
  { code: 'RO', name: 'Romania', currency: 'RON' },
  { code: 'HU', name: 'Hungary', currency: 'HUF' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
  { code: 'HR', name: 'Croatia', currency: 'EUR' },
  { code: 'SE', name: 'Sweden', currency: 'SEK' },
  { code: 'NO', name: 'Norway', currency: 'NOK' },
  { code: 'DK', name: 'Denmark', currency: 'DKK' },
  { code: 'FI', name: 'Finland', currency: 'EUR' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF' },
  { code: 'RU', name: 'Russia', currency: 'RUB' },
  { code: 'BY', name: 'Belarus', currency: 'BYN' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
  { code: 'GE', name: 'Georgia', currency: 'GEL' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
  { code: 'AM', name: 'Armenia', currency: 'AMD' },
  { code: 'MD', name: 'Moldova', currency: 'MDL' },
  { code: 'TR', name: 'Turkey', currency: 'TRY' },
  { code: 'IL', name: 'Israel', currency: 'ILS' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'CN', name: 'China', currency: 'CNY' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'MX', name: 'Mexico', currency: 'MXN' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'AR', name: 'Argentina', currency: 'ARS' },
  { code: 'CL', name: 'Chile', currency: 'CLP' },
  { code: 'CO', name: 'Colombia', currency: 'COP' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'KE', name: 'Kenya', currency: 'KES' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв' },
];

function SearchableDropdown({
  label,
  icon,
  items,
  value,
  onChange,
  renderItem,
  renderSelected,
  placeholder,
  searchPlaceholder,
  nothingFound,
}: {
  label: string;
  icon: React.ReactNode;
  items: { key: string; searchText: string }[];
  value: string;
  onChange: (key: string) => void;
  renderItem: (key: string, isSelected: boolean) => React.ReactNode;
  renderSelected: (key: string) => React.ReactNode;
  placeholder: string;
  searchPlaceholder: string;
  nothingFound: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen((v) => !v);
    setSearch('');
  };

  const filtered = items.filter((item) =>
    item.searchText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#3347ff]/40 focus:border-[#3347ff]/50 transition-all text-left"
        >
          {value ? (
            <span className="text-white">{renderSelected(value)}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            ref={listRef}
            style={dropdownStyle}
            className="bg-[#061230] border border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5"
          >
            <div className="p-2 border-b border-white/10">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                />
              </div>
            </div>
            <div className="max-h-[240px] overflow-y-auto scrollbar-dropdown">
              {filtered.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 text-center">{nothingFound}</div>
              ) : (
                filtered.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onChange(item.key);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                      item.key === value
                        ? 'bg-[#3347ff]/15 text-[#8b9aff]'
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {renderItem(item.key, item.key === value)}
                    {item.key === value && <Check className="w-4 h-4 text-[#3347ff] shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CurrencyCountryModalProps {
  onComplete: () => void;
}

export function CurrencyCountryModal({ onComplete }: CurrencyCountryModalProps) {
  const t = useTranslations('currencyModal');
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (code: string) => {
    setCountry(code);
    const match = COUNTRIES.find((c) => c.code === code);
    if (match) {
      setCurrency(match.currency);
    }
  };

  const handleSubmit = async () => {
    if (!country || !currency) return;
    setLoading(true);
    setError(null);
    try {
      const countryData = COUNTRIES.find((c) => c.code === country);
      await api('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          country: countryData?.name || country,
          currency,
        }),
      });
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error_default'));
    } finally {
      setLoading(false);
    }
  };

  const countryItems = COUNTRIES.map((c) => ({ key: c.code, searchText: c.name + ' ' + c.code }));
  const currencyItems = CURRENCIES.map((c) => ({ key: c.code, searchText: c.code + ' ' + c.name + ' ' + c.symbol }));

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-[#061230]/90 backdrop-blur-md" />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md relative overflow-hidden rounded-2xl shadow-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 bg-[#061230]" />
          <div
            className="absolute inset-0 opacity-85"
            style={{
              backgroundImage: 'url(/images/small.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061230]/80 via-transparent to-[#061230]/90" />

          <div className="relative border border-white/10 rounded-2xl">
            <div className="h-0.5 bg-gradient-to-r from-transparent via-[#3347ff] to-transparent" />

            <div className="px-6 pt-8 pb-5 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3347ff]/20 to-[#2a3ae6]/10 border border-white/10 mb-5">
                <Globe className="w-7 h-7 text-[#6b7fff]" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
              <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            <div className="px-6 pb-4 space-y-4">
              <SearchableDropdown
                label={t('label_country')}
                icon={<Globe className="w-3.5 h-3.5" />}
                items={countryItems}
                value={country}
                onChange={handleCountryChange}
                placeholder={t('placeholder_country')}
                searchPlaceholder={t('search_placeholder')}
                nothingFound={t('nothing_found')}
                renderItem={(key) => {
                  const c = COUNTRIES.find((x) => x.code === key);
                  return c ? (
                    <span className="flex items-center gap-2.5">
                      <ReactCountryFlag countryCode={c.code} svg style={{ width: '1.25em', height: '1.25em', borderRadius: '2px' }} />
                      <span>{c.name}</span>
                    </span>
                  ) : null;
                }}
                renderSelected={(key) => {
                  const c = COUNTRIES.find((x) => x.code === key);
                  return c ? (
                    <span className="flex items-center gap-2.5">
                      <ReactCountryFlag countryCode={c.code} svg style={{ width: '1.25em', height: '1.25em', borderRadius: '2px' }} />
                      <span>{c.name}</span>
                    </span>
                  ) : key;
                }}
              />

              <SearchableDropdown
                label={t('label_currency')}
                icon={<Banknote className="w-3.5 h-3.5" />}
                items={currencyItems}
                value={currency}
                onChange={setCurrency}
                placeholder={t('placeholder_currency')}
                searchPlaceholder={t('search_placeholder')}
                nothingFound={t('nothing_found')}
                renderItem={(key) => {
                  const c = CURRENCIES.find((x) => x.code === key);
                  return c ? (
                    <span className="flex items-center gap-2">
                      <span className="w-8 text-gray-400 font-mono text-xs">{c.symbol}</span>
                      <span>{c.code}</span>
                      <span className="text-gray-500">- {c.name}</span>
                    </span>
                  ) : null;
                }}
                renderSelected={(key) => {
                  const c = CURRENCIES.find((x) => x.code === key);
                  return c ? c.symbol + ' ' + c.code + ' - ' + c.name : key;
                }}
              />

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
                  <p className="text-sm text-red-400 text-center">{error}</p>
                </div>
              )}

              <div className="px-6 pt-2 pb-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!country || !currency || loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed btn-accent text-white shadow-lg shadow-[#3347ff]/20 hover:shadow-[#3347ff]/30"
                >
                  {loading ? t('btn_saving') : t('btn_continue')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
