'use client';

import { useState, useCallback, useMemo } from 'react';
import { FilePlus, ClockCountdown, CheckCircle, FileText, XCircle, CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import { useTranslations, useLocale } from 'next-intl';
import { SumsubKyc } from '@/components/kyc/SumsubKyc';
import { useAuth } from '@/lib/hooks/useAuth';
import { VERIFICATION_STORAGE_KEY } from '@/lib/hooks/useVerification';
const VERIFICATION_COUNTRY_KEY = 'profile-verification-country';

type VerificationStatus = 'intro' | 'country-select' | 'sdk' | 'pending' | 'verified' | 'rejected';

const VERIFICATION_COUNTRY_ENTRIES = [
  { code: 'UA', flag: '🇺🇦' },
  { code: 'RU', flag: '🇷🇺' },
  { code: 'BY', flag: '🇧🇾' },
  { code: 'KZ', flag: '🇰🇿' },
  { code: 'UZ', flag: '🇺🇿' },
  { code: 'GE', flag: '🇬🇪' },
  { code: 'AZ', flag: '🇦🇿' },
  { code: 'AM', flag: '🇦🇲' },
  { code: 'MD', flag: '🇲🇩' },
  { code: 'PL', flag: '🇵🇱' },
  { code: 'DE', flag: '🇩🇪' },
  { code: 'FR', flag: '🇫🇷' },
  { code: 'GB', flag: '🇬🇧' },
  { code: 'TR', flag: '🇹🇷' },
  { code: 'AE', flag: '🇦🇪' },
  { code: 'US', flag: '🇺🇸' },
  { code: 'CA', flag: '🇨🇦' },
  { code: 'IL', flag: '🇮🇱' },
  { code: 'IN', flag: '🇮🇳' },
  { code: 'CN', flag: '🇨🇳' },
  { code: 'BR', flag: '🇧🇷' },
  { code: 'OTHER', flag: '🌐' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStoredStatus(): VerificationStatus {
  if (typeof window === 'undefined') return 'intro';
  const stored = localStorage.getItem(VERIFICATION_STORAGE_KEY);
  if (
    stored === 'pending' ||
    stored === 'verified' ||
    stored === 'rejected' ||
    stored === 'sdk'
  )
    return stored;
  return 'intro';
}

function getStoredCountry(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(VERIFICATION_COUNTRY_KEY) ?? '';
}

function resetAll(setStatus: (s: VerificationStatus) => void, setCountry: (c: string) => void) {
  localStorage.removeItem(VERIFICATION_STORAGE_KEY);
  localStorage.removeItem(VERIFICATION_COUNTRY_KEY);
  setStatus('intro');
  setCountry('');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VerificationSection() {
  const t = useTranslations('verification');
  const locale = useLocale();
  const sumsubLang = locale === 'ua' ? 'uk' : locale;
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>(getStoredStatus);
  const [selectedCountry, setSelectedCountry] = useState<string>(getStoredCountry);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const countries = useMemo(
    () =>
      VERIFICATION_COUNTRY_ENTRIES.map((c) => ({
        code: c.code,
        flag: c.flag,
        name: t(`countries.${c.code}`),
      })),
    [t],
  );

  const activeCountry = countries.find((c) => c.code === selectedCountry);

  const filteredCountries = search.trim()
    ? countries.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.code.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : countries;

  const handleSelectCountry = (code: string) => {
    setSelectedCountry(code);
    setDropdownOpen(false);
    setSearch('');
    localStorage.setItem(VERIFICATION_COUNTRY_KEY, code);
  };

  const handleLaunchSdk = () => {
    localStorage.setItem(VERIFICATION_STORAGE_KEY, 'sdk');
    setStatus('sdk');
  };

  const handleStepCompleted = useCallback((payload: unknown) => {
    console.log('[KYC] onStepCompleted', payload);
    setStatus('pending');
    localStorage.setItem(VERIFICATION_STORAGE_KEY, 'pending');
  }, []);

  const handleApplicantStatusChanged = useCallback((payload: unknown) => {
    console.log('[KYC] onApplicantStatusChanged', payload);
    const p = payload as {
      reviewStatus?: string;
      reviewResult?: { reviewAnswer?: string };
    };
    const answer = p?.reviewResult?.reviewAnswer;
    if (answer === 'GREEN') {
      setStatus('verified');
      localStorage.setItem(VERIFICATION_STORAGE_KEY, 'verified');
    } else if (answer === 'RED') {
      setStatus('rejected');
      localStorage.setItem(VERIFICATION_STORAGE_KEY, 'rejected');
    } else if (p?.reviewStatus === 'pending' || p?.reviewStatus === 'onHold') {
      setStatus('pending');
      localStorage.setItem(VERIFICATION_STORAGE_KEY, 'pending');
    }
  }, []);

  return (
    <div className="w-full rounded-xl bg-white/5 p-6 space-y-6">

      {/* ── Шаг 1: Описание ─────────────────────────────────────────── */}
      {status === 'intro' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-white mb-3">{t('intro_title')}</h3>
            <p className="text-sm text-white/70 mb-4 leading-relaxed">{t('intro_p1')}</p>
            <p className="text-sm font-medium text-white/80 mb-2">{t('intro_docs_title')}</p>
            <ul className="space-y-2 text-sm text-white/60">
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('intro_doc_id')}</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('intro_doc_address')}</span>
              </li>
            </ul>
            <p className="text-xs text-white/40 mt-4">{t('intro_formats')}</p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStatus('country-select')}
              disabled={isLoading || !user}
              className="w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FilePlus className="w-4 h-4" />
              {t('btn_start')}
            </button>
          </div>
        </div>
      )}

      {/* ── Шаг 2: Выбор страны ─────────────────────────────────────── */}
      {status === 'country-select' && (
        <div className="space-y-5 max-w-md">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">{t('country_title')}</h3>
            <p className="text-xs text-white/50">{t('country_subtitle')}</p>
          </div>

          {/* Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 transition-colors"
            >
              {activeCountry ? (
                <span className="flex items-center gap-3">
                  <span className="text-xl leading-none">{activeCountry.flag}</span>
                  <span>{activeCountry.name}</span>
                </span>
              ) : (
                <span className="text-white/40">{t('select_country_placeholder')}</span>
              )}
              <CaretDown
                className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => { setDropdownOpen(false); setSearch(''); }}
                  aria-hidden="true"
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                      <MagnifyingGlass className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('search_country')}
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>
                  </div>
                  {/* List */}
                  <div className="max-h-56 overflow-y-auto py-1 scrollbar-dropdown">
                    {filteredCountries.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-white/40 text-center">{t('nothing_found')}</p>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelectCountry(c.code)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            selectedCountry === c.code
                              ? 'bg-[#3347ff]/25 text-white'
                              : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <span className="text-xl leading-none">{c.flag}</span>
                          <span>{c.name}</span>
                          {selectedCountry === c.code && (
                            <span className="ml-auto text-[#7b8fff] text-xs">✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setStatus('intro')}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium uppercase tracking-wider transition-colors"
            >
              {t('back')}
            </button>
            <button
              type="button"
              onClick={handleLaunchSdk}
              disabled={!selectedCountry}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FilePlus className="w-4 h-4" />
              {t('continue')}
            </button>
          </div>
        </div>
      )}

      {/* ── Шаг 3: Sumsub WebSDK ────────────────────────────────────── */}
      {status === 'sdk' && (
        <>
          {user ? (
            <SumsubKyc
              userId={user.id}
              lang={sumsubLang}
              country={selectedCountry !== 'OTHER' ? selectedCountry : undefined}
              onStepCompleted={handleStepCompleted}
              onApplicantStatusChanged={handleApplicantStatusChanged}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
            </div>
          )}

        </>
      )}

      {/* ── Шаг 4: На проверке ──────────────────────────────────────── */}
      {status === 'pending' && (
        <div className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 mb-4">
            <ClockCountdown className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('pending_title')}</h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-6">{t('pending_desc')}</p>
          <p className="text-xs text-white/50 mb-4">{t('pending_support')}</p>

        </div>
      )}

      {/* ── Шаг 5: Верифицирован ────────────────────────────────────── */}
      {status === 'verified' && (
        <div className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-400" weight="fill" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('verified_title')}</h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-4">{t('verified_desc')}</p>

        </div>
      )}

      {/* ── Шаг 6: Отклонён ─────────────────────────────────────────── */}
      {status === 'rejected' && (
        <div className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t('rejected_title')}</h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-6">{t('rejected_desc')}</p>
          <button
            type="button"
            onClick={() => setStatus('country-select')}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors"
          >
            <FilePlus className="w-4 h-4" />
            {t('try_again')}
          </button>

        </div>
      )}
    </div>
  );
}
