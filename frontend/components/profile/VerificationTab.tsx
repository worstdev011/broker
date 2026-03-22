'use client';

import { useState, useCallback } from 'react';
import { FileCheck, Clock, CheckCircle2, FileText, XCircle, ChevronDown, Search } from 'lucide-react';
import { SumsubKyc } from '@/components/kyc/SumsubKyc';
import { useAuth } from '@/lib/hooks/useAuth';
import { VERIFICATION_STORAGE_KEY } from '@/lib/hooks/useVerification';
const VERIFICATION_COUNTRY_KEY = 'profile-verification-country';

type VerificationStatus = 'intro' | 'country-select' | 'sdk' | 'pending' | 'verified' | 'rejected';

// ── Country list ─────────────────────────────────────────────────────────────

interface Country {
  code: string;
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'UA', name: 'Украина', flag: '🇺🇦' },
  { code: 'RU', name: 'Россия', flag: '🇷🇺' },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿' },
  { code: 'GE', name: 'Грузия', flag: '🇬🇪' },
  { code: 'AZ', name: 'Азербайджан', flag: '🇦🇿' },
  { code: 'AM', name: 'Армения', flag: '🇦🇲' },
  { code: 'MD', name: 'Молдова', flag: '🇲🇩' },
  { code: 'PL', name: 'Польша', flag: '🇵🇱' },
  { code: 'DE', name: 'Германия', flag: '🇩🇪' },
  { code: 'FR', name: 'Франция', flag: '🇫🇷' },
  { code: 'GB', name: 'Великобритания', flag: '🇬🇧' },
  { code: 'TR', name: 'Турция', flag: '🇹🇷' },
  { code: 'AE', name: 'ОАЭ', flag: '🇦🇪' },
  { code: 'US', name: 'США', flag: '🇺🇸' },
  { code: 'CA', name: 'Канада', flag: '🇨🇦' },
  { code: 'IL', name: 'Израиль', flag: '🇮🇱' },
  { code: 'IN', name: 'Индия', flag: '🇮🇳' },
  { code: 'CN', name: 'Китай', flag: '🇨🇳' },
  { code: 'BR', name: 'Бразилия', flag: '🇧🇷' },
  { code: 'OTHER', name: 'Другая страна', flag: '🌐' },
];

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
  const { user, isLoading } = useAuth();
  const [status, setStatus] = useState<VerificationStatus>(getStoredStatus);
  const [selectedCountry, setSelectedCountry] = useState<string>(getStoredCountry);
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeCountry = COUNTRIES.find((c) => c.code === selectedCountry);

  const filteredCountries = search.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.code.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : COUNTRIES;

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
            <h3 className="text-sm font-medium text-white mb-3">
              Добро пожаловать в процесс верификации
            </h3>
            <p className="text-xs sm:text-sm text-white/70 mb-4 leading-relaxed">
              Для завершения верификации аккаунта необходимо загрузить документы,
              подтверждающие вашу личность. Это стандартная процедура KYC, которая
              повышает безопасность платформы и позволяет снять ограничения.
            </p>
            <p className="text-xs sm:text-sm font-medium text-white/80 mb-2">
              Требуемые документы:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-white/60">
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Документ, удостоверяющий личность (паспорт, водительские права или
                  ID-карта)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Подтверждение адреса проживания - не старше 3 месяцев (опционально)
                </span>
              </li>
            </ul>
            <p className="text-[11px] sm:text-xs text-white/40 mt-4">
              Форматы: JPG, PNG, PDF. Максимальный размер файла - 10 МБ.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setStatus('country-select')}
              disabled={isLoading || !user}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 sm:px-8 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileCheck className="w-4 h-4" />
              Начать верификацию
            </button>
          </div>
        </div>
      )}

      {/* ── Шаг 2: Выбор страны ─────────────────────────────────────── */}
      {status === 'country-select' && (
        <div className="space-y-5 max-w-md">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">
              Выберите вашу страну
            </h3>
            <p className="text-xs text-white/50">
              Страна гражданства - нужна для подбора подходящих документов
            </p>
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
                <span className="text-white/40">Выберите страну...</span>
              )}
              <ChevronDown
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
                      <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск страны..."
                        className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                      />
                    </div>
                  </div>
                  {/* List */}
                  <div className="max-h-56 overflow-y-auto py-1 scrollbar-dropdown">
                    {filteredCountries.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-white/40 text-center">Ничего не найдено</p>
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
              Назад
            </button>
            <button
              type="button"
              onClick={handleLaunchSdk}
              disabled={!selectedCountry}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck className="w-4 h-4" />
              Продолжить
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
              lang="ru"
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
            <Clock className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
            Документы отправлены на проверку
          </h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
            Ваши документы получены и находятся на проверке. Обычно верификация
            занимает до 24 часов. Мы уведомим вас по email о результате.
          </p>
          <p className="text-xs text-white/50 mb-4">
            В случае вопросов обратитесь в службу поддержки
          </p>

        </div>
      )}

      {/* ── Шаг 5: Верифицирован ────────────────────────────────────── */}
      {status === 'verified' && (
        <div className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
            Аккаунт успешно верифицирован
          </h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-4">
            Ваша личность подтверждена. Теперь вам доступен вывод средств и все
            возможности платформы.
          </p>

        </div>
      )}

      {/* ── Шаг 6: Отклонён ─────────────────────────────────────────── */}
      {status === 'rejected' && (
        <div className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/20 mb-4">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
            Верификация отклонена
          </h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
            К сожалению, ваши документы не прошли проверку. Пожалуйста, попробуйте
            загрузить документы повторно или обратитесь в службу поддержки.
          </p>
          <button
            type="button"
            onClick={() => setStatus('country-select')}
            className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            Попробовать снова
          </button>

        </div>
      )}
    </div>
  );
}
