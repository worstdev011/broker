'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, Check } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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

/** next-intl uses `ua`; ICU / Intl uses `uk` for Ukrainian */
function appLocaleToBcp47(locale: string): string {
  if (locale === 'ua') return 'uk';
  return locale;
}

function useRegionDisplayNames(locale: string) {
  const intlLocale = appLocaleToBcp47(locale);
  return useMemo(() => {
    try {
      return new Intl.DisplayNames([intlLocale], { type: 'region' });
    } catch {
      return new Intl.DisplayNames(['en'], { type: 'region' });
    }
  }, [intlLocale]);
}

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
  const [visible, setVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [open]);

  const handleOpen = () => {
    if (open) { handleClose(); return; }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setSearch('');
    setVisible(false);
    setOpen(true);
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => { setOpen(false); setSearch(''); }, 160);
  };

  const handleSelect = (key: string) => {
    onChange(key);
    handleClose();
  };

  const filtered = items.filter((item) =>
    item.searchText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-white/40 tracking-wide">{label}</label>
      <div className="relative">

        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-left outline-none transition-all duration-150"
          style={{
            background: open ? 'rgba(36,120,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: open
              ? '1px solid rgba(36,120,255,0.45)'
              : value
                ? '1px solid rgba(255,255,255,0.18)'
                : '1px solid rgba(255,255,255,0.1)',
            boxShadow: open ? '0 0 0 3px rgba(36,120,255,0.1)' : 'none',
          }}
        >
          <span className="flex-1 min-w-0">
            {value ? (
              <span className="text-white text-sm">{renderSelected(value)}</span>
            ) : (
              <span className="text-white/30 text-sm">{placeholder}</span>
            )}
          </span>
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke={open ? '#4d86ff' : 'rgba(255,255,255,0.35)'}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 180ms ease, stroke 150ms ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            ref={listRef}
            style={{
              ...dropdownStyle,
              background: '#0b1525',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(-6px) scale(0.98)',
              transition: 'opacity 160ms ease, transform 160ms ease',
            }}
          >
            {/* Search */}
            <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div
                className="flex items-center gap-2.5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '9px',
                  padding: '8px 12px',
                }}
              >
                <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-[13px] text-white outline-none"
                  style={{ color: 'white' }}
                  placeholder-style={{ color: 'rgba(255,255,255,0.25)' }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="shrink-0 text-white/25 hover:text-white/50 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div style={{ maxHeight: '232px', overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
                  {nothingFound}
                </div>
              ) : (
                <div style={{ padding: '4px' }}>
                  {filtered.map((item) => {
                    const selected = item.key === value;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelect(item.key)}
                        className="w-full flex items-center justify-between gap-2 text-left transition-colors duration-100"
                        style={{
                          padding: '9px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          background: selected ? 'rgba(36,120,255,0.13)' : 'transparent',
                          color: selected ? '#7aacff' : 'rgba(255,255,255,0.7)',
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <span className="flex-1 min-w-0">{renderItem(item.key, selected)}</span>
                        {selected && (
                          <Check className="w-3.5 h-3.5 shrink-0" style={{ color: '#4d86ff' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
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
  const locale = useLocale();
  const regionNames = useRegionDisplayNames(locale);
  const [country, setCountry] = useState('');
  const [currency, setCurrency] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countryDisplayName = (code: string) => {
    const row = COUNTRIES.find((c) => c.code === code);
    return regionNames.of(code) || row?.name || code;
  };

  const handleCountryChange = (code: string) => {
    setCountry(code);
    const match = COUNTRIES.find((c) => c.code === code);
    if (match) setCurrency(match.currency);
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

  const countryItems = useMemo(
    () =>
      COUNTRIES.map((c) => {
        const label = regionNames.of(c.code) || c.name;
        return {
          key: c.code,
          searchText: `${label} ${c.name} ${c.code}`.toLowerCase(),
        };
      }),
    [regionNames]
  );

  const currencyItems = useMemo(
    () =>
      CURRENCIES.map((c) => ({
        key: c.code,
        searchText: `${c.code} ${c.name} ${c.symbol}`.toLowerCase(),
      })),
    []
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)' }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="currency-modal-title"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0a1835]"
        >
          {/* Blue top line */}
          <div className="h-[3px] w-full bg-[#2478ff] rounded-t-[2px]" />

          {/* Header + logo */}
          <div className="px-7 pt-6 pb-5 text-center">
            <div className="flex justify-center mb-5">
              <Image
                src="/images/logo.png"
                alt="Comfortrade"
                width={160}
                height={48}
                className="h-11 w-auto object-contain object-center"
                priority
              />
            </div>
            <h2 id="currency-modal-title" className="text-[1.6rem] font-bold text-white leading-tight">
              {t('title')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/50">{t('subtitle')}</p>
          </div>

          {/* Fields */}
          <div className="px-7 pb-3 space-y-5">
            <SearchableDropdown
              label={t('label_country')}
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
                    <span>{countryDisplayName(c.code)}</span>
                  </span>
                ) : null;
              }}
              renderSelected={(key) => {
                const c = COUNTRIES.find((x) => x.code === key);
                return c ? (
                  <span className="flex items-center gap-2.5">
                    <ReactCountryFlag countryCode={c.code} svg style={{ width: '1.25em', height: '1.25em', borderRadius: '2px' }} />
                    <span>{countryDisplayName(c.code)}</span>
                  </span>
                ) : key;
              }}
            />

            <SearchableDropdown
              label={t('label_currency')}
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
                    <span>{c.code}</span>
                    <span className="text-white/40">- {c.name}</span>
                  </span>
                ) : null;
              }}
              renderSelected={(key) => {
                const c = CURRENCIES.find((x) => x.code === key);
                return c ? `${c.code} - ${c.name}` : key;
              }}
            />

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5">
                <p className="text-sm text-red-400 text-center">{error}</p>
              </div>
            )}
          </div>

          {/* Button */}
          <div className="px-7 pt-3 pb-7">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!country || !currency || loading}
              className="w-full font-semibold text-white rounded-xl outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                height: '48px',
                fontSize: '15px',
                background: '#2478ff',
                boxShadow: '0 4px 16px rgba(36,120,255,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3d8aff';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#2478ff';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              {loading ? t('btn_saving') : t('btn_continue')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
