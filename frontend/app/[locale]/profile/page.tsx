'use client';

import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/components/navigation';
import ReactCountryFlag from 'react-country-flag';
import { Upload, Trash2, Globe, Plus, Copy, Check } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppHeader } from '@/components/AppHeader';
import { WalletTab } from '@/components/profile/WalletTab';
import { TradeProfileTab } from '@/components/profile/TradeProfileTab';
import { SupportTab } from '@/components/profile/SupportTab';
import { SecuritySection } from '@/components/profile/SecurityTab';
import { VerificationSection } from '@/components/profile/VerificationTab';
import { api } from '@/lib/api/api';
import { getCsrfToken } from '@/lib/api/csrf';
import { useAuth } from '@/lib/hooks/useAuth';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import { LANGUAGES, LANG_STORAGE_KEY } from '@/lib/languages';
import type { AccountSnapshot } from '@/types/account';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function formatBalance(balance: number, currency: string): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
  if (currency === 'USD') return `${formatted} USD`;
  if (currency === 'RUB') return `${formatted} ₽`;
  if (currency === 'UAH') return `${formatted} UAH`;
  return formatted;
}

const TIMEZONE_STORAGE_KEY = 'profile-timezone';

const TIMEZONES = [
  { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
  { value: 'Europe/Berlin', label: 'Берлин (UTC+1)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Сидней (UTC+10)' },
] as const;

const COUNTRIES = [
  { code: 'UA', name: 'Украина', flag: 'https://flagcdn.com/w40/ua.png' },
  { code: 'RU', name: 'Россия', flag: 'https://flagcdn.com/w40/ru.png' },
  { code: 'BY', name: 'Беларусь', flag: 'https://flagcdn.com/w40/by.png' },
  { code: 'KZ', name: 'Казахстан', flag: 'https://flagcdn.com/w40/kz.png' },
  { code: 'US', name: 'США', flag: 'https://flagcdn.com/w40/us.png' },
  { code: 'DE', name: 'Германия', flag: 'https://flagcdn.com/w40/de.png' },
  { code: 'PL', name: 'Польша', flag: 'https://flagcdn.com/w40/pl.png' },
  { code: 'GB', name: 'Великобритания', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'FR', name: 'Франция', flag: 'https://flagcdn.com/w40/fr.png' },
  { code: 'OTHER', name: 'Другое', flag: null },
];

/** Маппинг имени страны (как приходит из API после модалки выбора) в ISO код для флага */
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Ukraine: 'UA', 'United States': 'US', 'United Kingdom': 'GB', Germany: 'DE', France: 'FR', Italy: 'IT',
  Spain: 'ES', Portugal: 'PT', Netherlands: 'NL', Belgium: 'BE', Austria: 'AT', Poland: 'PL',
  'Czech Republic': 'CZ', Romania: 'RO', Hungary: 'HU', Bulgaria: 'BG', Croatia: 'HR', Sweden: 'SE',
  Norway: 'NO', Denmark: 'DK', Finland: 'FI', Switzerland: 'CH', Russia: 'RU', Belarus: 'BY',
  Kazakhstan: 'KZ', Uzbekistan: 'UZ', Georgia: 'GE', Azerbaijan: 'AZ', Armenia: 'AM', Moldova: 'MD',
  Turkey: 'TR', Israel: 'IL', 'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', India: 'IN',
  China: 'CN', Japan: 'JP', 'South Korea': 'KR', Thailand: 'TH', Vietnam: 'VN', Indonesia: 'ID',
  Malaysia: 'MY', Philippines: 'PH', Singapore: 'SG', Australia: 'AU', 'New Zealand': 'NZ',
  Canada: 'CA', Mexico: 'MX', Brazil: 'BR', Argentina: 'AR', Chile: 'CL', Colombia: 'CO',
  'South Africa': 'ZA', Nigeria: 'NG', Egypt: 'EG', Kenya: 'KE',
};

function resolveCountryToCode(country: string | null | undefined): string {
  if (!country || country === 'OTHER') return 'UA';
  const trimmed = country.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return COUNTRY_NAME_TO_CODE[trimmed] ?? COUNTRIES.find((c) => c.name === trimmed)?.code ?? 'UA';
}

interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  phone?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled?: boolean;
}

const SIDEBAR_ITEMS = [
  { id: 'profile', label: 'Личный профиль', shortLabel: 'Профиль', href: '/profile?tab=profile', iconSrc: '/images/profile1.png' },
  { id: 'wallet', label: 'Кошелек', shortLabel: 'Кошелёк', href: '/profile?tab=wallet', iconSrc: '/images/wallet1.png' },
  { id: 'trade', label: 'Торговый профиль', shortLabel: 'Торги', href: '/profile?tab=trade', iconSrc: '/images/trading1.png' },
  { id: 'support', label: 'Поддержка', shortLabel: 'Поддержка', href: '/profile?tab=support', iconSrc: '/images/support1.png' },
] as const;

function formatPhoneValue(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('380') && digits.length <= 12) {
    const rest = digits.slice(3);
    if (rest.length <= 2) return `+380 (${rest}`;
    if (rest.length <= 5) return `+380 (${rest.slice(0, 2)}) ${rest.slice(2)}`;
    return `+380 (${rest.slice(0, 2)}) ${rest.slice(2, 5)}-${rest.slice(5, 7)}-${rest.slice(7, 9)}`;
  }
  if (digits.startsWith('7') && digits.length <= 11) {
    const rest = digits.slice(1);
    if (rest.length <= 3) return `+7 (${rest}`;
    if (rest.length <= 6) return `+7 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
    return `+7 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
  }
  return raw.startsWith('+') ? raw : `+${digits}`;
}

function parsePhoneToE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '');
  if (digits.startsWith('380')) return `+${digits.slice(0, 12)}`;
  if (digits.startsWith('7')) return `+${digits.slice(0, 11)}`;
  return digits ? `+${digits}` : '';
}

function LabelWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">
      {label}
      <span className="group/tip relative inline-flex cursor-help" aria-label={hint}>
        <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-white/50 hover:bg-white/20 hover:text-white/70 transition-colors" aria-hidden>
          ?
        </span>
        <span className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1.5 bg-[#0f1a2e] border border-white/10 rounded-lg text-xs text-white/80 max-w-[220px] opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-20 shadow-xl pointer-events-none">
          {hint}
        </span>
      </span>
    </label>
  );
}

function PersonalProfileTab({ onProfileUpdate }: { onProfileUpdate?: (p: UserProfile) => void }) {
  const router = useRouter();
  const { logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emailVerified, setEmailVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('email-verified') === '1';
  });
  const [emailConfirming, setEmailConfirming] = useState(false);
  const [lang, setLang] = useState('RU');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [timezone, setTimezone] = useState('Europe/Kiev');
  const [showTimezoneMenu, setShowTimezoneMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDeleteModal = useCallback(() => {
    if (!deleting) {
      setShowDeleteModal(false);
      setDeleteError(null);
      setDeleteReason('');
      setDeletePassword('');
    }
  }, [deleting]);

  const deleteModalRef = useModalA11y(showDeleteModal, closeDeleteModal, { focusFirstSelector: '[data-delete-modal-first]' });

  useEffect(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) setLang(stored);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (stored && TIMEZONES.some((t) => t.value === stored)) setTimezone(stored);
  }, []);

  useEffect(() => {
    api<{ user: UserProfile }>('/api/user/profile')
      .then((res) => {
        setProfile(res.user);
        setFirstName(res.user.firstName || '');
        setLastName(res.user.lastName || '');
        setNickname(res.user.nickname || '');
        setPhone(res.user.phone || '');
        // Нормализуем страну в код (API может вернуть имя из модалки - "United States" или код "US")
        setCountry(resolveCountryToCode(res.user.country) || 'UA');
        setDateOfBirth(res.user.dateOfBirth ? new Date(res.user.dateOfBirth).toISOString().slice(0, 10) : '');
      })
      .catch(() => setError('Не удалось загрузить профиль'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (firstName.trim()) body.firstName = firstName.trim();
      if (lastName.trim()) body.lastName = lastName.trim();
      if (nickname.trim()) {
        const n = nickname.trim().startsWith('@') ? nickname.trim() : `@${nickname.trim()}`;
        if (!/^@[a-zA-Z0-9_]{5,20}$/.test(n)) {
          setError('Никнейм: формат @username, 5-20 символов (буквы, цифры, _)');
          setSaving(false);
          return;
        }
        body.nickname = n;
      }
      if (phone.trim()) {
        const p = phone.trim();
        if (!/^\+[1-9]\d{1,14}$/.test(p)) {
          setError('Телефон: формат +код страны и номер (например +380991234567)');
          setSaving(false);
          return;
        }
        body.phone = p;
      }
      if (country && country !== 'OTHER') body.country = country;
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;

      const res = await api<{ user: UserProfile }>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setProfile(res.user);
      setSuccess(true);
      onProfileUpdate?.(res.user);
      document.dispatchEvent(new CustomEvent('profile-updated', { detail: res.user }));
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      setError('Допустимые форматы: JPG, PNG');
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Файл не должен превышать 2 МБ');
      e.target.value = '';
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const csrfToken = await getCsrfToken();
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'csrf-token': csrfToken,
        },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка загрузки');
      }
      const { avatarUrl } = await res.json();
      const updated = profile ? { ...profile, avatarUrl } : null;
      setProfile(updated);
      if (updated) {
        onProfileUpdate?.(updated);
        document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmEmail = async () => {
    setEmailConfirming(true);
    try {
      await new Promise((r) => setTimeout(r, 1400));
      setEmailVerified(true);
      localStorage.setItem('email-verified', '1');
    } finally {
      setEmailConfirming(false);
    }
  };

  const handleLangChange = (code: string) => {
    setLang(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    }
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIMEZONE_STORAGE_KEY, value);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteReason) {
      setDeleteError('Укажите причину удаления');
      return;
    }
    if (!deletePassword || deletePassword.length < 8) {
      setDeleteError('Введите пароль (минимум 8 символов)');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api('/api/user/profile', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword, reason: deleteReason }),
      });
      await logout();
      router.push('/');
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } };
      setDeleteError(err.response?.data?.message || err.message || 'Неверный пароль');
    } finally {
      setDeleting(false);
    }
  };

  const handleAvatarDelete = async () => {
    setUploading(true);
    setError(null);
    try {
      await api('/api/user/avatar', { method: 'DELETE' });
      setProfile((p) => (p ? { ...p, avatarUrl: null } : null));
      const updated = profile ? { ...profile, avatarUrl: null } : null;
      if (updated) {
        onProfileUpdate?.(updated);
        document.dispatchEvent(new CustomEvent('profile-updated', { detail: updated }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Процент заполнения и надёжности (для правой колонки)
  const profileFields = [
    !!profile?.avatarUrl,
    !!firstName.trim(),
    !!lastName.trim(),
    !!nickname.trim(),
    !!phone.trim(),
    !!country && country !== 'OTHER',
    !!dateOfBirth,
  ];
  const profileComplete = Math.round((profileFields.filter(Boolean).length / 7) * 100);
  const trustFactors = [
    !!profile?.twoFactorEnabled,
    !!phone.trim(),
    !!firstName.trim() && !!lastName.trim(),
    !!profile?.avatarUrl,
  ];
  const trustPercent = Math.round((trustFactors.filter(Boolean).length / 4) * 100);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      scrollContainer.classList.add('scrolling');
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        scrollContainer.classList.remove('scrolling');
      }, 1000);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-0 flex-1 flex flex-col">
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className="flex-1 min-w-0 px-5 py-3 sm:p-6 md:p-8 overflow-auto scrollbar-dropdown">
            <div className="flex flex-col gap-6 sm:gap-8 p-6 sm:p-8 rounded-xl bg-[#030E28]">
              <div className="h-7 w-44 bg-white/10 rounded-lg animate-pulse" />
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                {/* Avatar skeleton */}
                <div className="flex flex-col shrink-0 w-44 sm:w-56 gap-3">
                  <div className="w-full aspect-square rounded-2xl bg-white/10 animate-pulse" />
                  <div className="h-10 rounded-xl bg-white/5 animate-pulse mt-2" />
                </div>
                {/* Fields skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i}>
                        <div className="h-3.5 w-20 bg-white/10 rounded animate-pulse mb-2" />
                        <div className="h-10 sm:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <div className="h-3.5 w-14 bg-white/10 rounded animate-pulse mb-2" />
                      <div className="h-10 sm:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                    </div>
                    <div>
                      <div className="h-3.5 w-28 bg-white/10 rounded animate-pulse mb-2" />
                      <div className="h-10 sm:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                    </div>
                    <div>
                      <div className="h-3.5 w-32 bg-white/10 rounded animate-pulse mb-2" />
                      <div className="h-10 sm:h-12 w-full bg-white/5 rounded-xl animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-6 sm:mt-8 flex justify-end">
                    <div className="h-12 w-44 rounded-xl bg-white/10 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Right sidebar skeleton */}
          <div className="hidden md:flex w-56 shrink-0 p-4 border-l border-white/10 flex-col gap-4 bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f]">
            <div className="rounded-xl bg-white/5 p-4 space-y-3">
              <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="rounded-xl bg-white/5 p-4 space-y-3">
              <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="h-3 w-44 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 flex-1 flex flex-col">
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Основной контент */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-w-0 px-5 py-3 sm:p-6 md:p-8 overflow-auto scrollbar-dropdown"
        >
          {/* ── Mobile profile hero (sidebar replacement on mobile) ─────── */}
          {profile && (
            <div className="md:hidden mb-4">
              <div className="relative rounded-2xl bg-[#030E28] border border-white/[0.08] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_10%_0%,rgba(51,71,255,0.12),transparent_60%)] pointer-events-none" />
                <div className="relative p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/40 to-transparent blur-sm" />
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl.startsWith('/') ? profile.avatarUrl : `${API_BASE}${profile.avatarUrl}`}
                          alt=""
                          className="relative w-14 h-14 rounded-full object-cover ring-2 ring-white/20 ring-offset-2 ring-offset-[#030E28]"
                        />
                      ) : (
                        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-xl font-bold text-white ring-2 ring-white/20 ring-offset-2 ring-offset-[#030E28]">
                          {(!firstName.trim() && !lastName.trim() && !nickname.replace(/^@/, '')) ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white/80">
                              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                            </svg>
                          ) : (
                            (
                              [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') ||
                              nickname.replace(/^@/, '') ||
                              profile.email?.split('@')[0] ||
                              '?'
                            )[0].toUpperCase()
                          )}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#030E28] z-10" />
                    </div>
                    {/* Name + country */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-white truncate">
                        {[firstName.trim(), lastName.trim()].filter(Boolean).join(' ') ||
                          nickname.replace(/^@/, '') ||
                          profile.email?.split('@')[0] ||
                          'Пользователь'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ReactCountryFlag
                          countryCode={country || 'UA'}
                          svg
                          style={{ width: '0.9em', height: '0.9em', borderRadius: '2px' }}
                        />
                        <span className="text-xs text-white/50 truncate">
                          {COUNTRIES.find((c) => c.code === country)?.name || '-'}
                        </span>
                      </div>
                    </div>
                    {/* Level badge */}
                    <div className="shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#022766]/80 to-[#051228]/80 border border-[#154594]/50">
                        <img src="/images/level.png" alt="" className="w-3 h-3 object-contain" />
                        <span className="text-[10px] font-medium text-[#84B2FF]">Ур. 1</span>
                      </div>
                    </div>
                  </div>
                  {/* Progress bars */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-white/40 uppercase tracking-wider">Профиль</span>
                        <span className="text-white/80 font-semibold tabular-nums">{profileComplete}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-[#3347ff] rounded-full transition-all duration-500" style={{ width: `${profileComplete}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-white/40 uppercase tracking-wider">Надёжность</span>
                        <span className="text-white/80 font-semibold tabular-nums">{trustPercent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${trustPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-red-900/40 border border-red-500/30 text-white text-xs sm:text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
              Профиль сохранён
            </div>
          )}

          <div className="flex flex-col gap-5 sm:gap-8 p-4 sm:p-6 md:p-8 rounded-xl bg-[#030E28]">
            <h1 className="text-base sm:text-2xl font-bold text-white">Личные данные</h1>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            {/* Левая колонка - аватар */}
            <div className="flex flex-col w-36 mx-auto sm:w-56 sm:mx-0 sm:shrink-0">
              <div className="relative w-full aspect-square">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60" />
                <div className="relative w-full h-full rounded-2xl overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#030E28] shadow-lg">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl.startsWith('/') ? profile.avatarUrl : `${API_BASE}${profile.avatarUrl}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex flex-col items-center justify-center gap-1.5 p-3 text-center">
                      <span className="text-xs sm:text-sm font-medium text-white/90">Загрузите фото профиля</span>
                      <span className="text-[10px] sm:text-xs text-white/70">JPG или PNG, макс. 2 МБ</span>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-5 mb-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" strokeWidth={2} />
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </button>
              {profile?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleAvatarDelete}
                  disabled={uploading}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Удалить
                </button>
              )}
              <p className="mt-1 text-xs text-white/50 text-center w-full">
                Фото профиля <span className="inline-flex w-4 h-4 rounded-full bg-white/20 items-center justify-center text-[10px] cursor-help" title="JPG или PNG, до 2 МБ">?</span>
              </p>
            </div>

            {/* Правая колонка - поля формы */}
            <div className="flex-1 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <div>
            <LabelWithHint label="Имя" hint="До 50 символов" />
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Введите имя"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={50}
            />
          </div>
          <div>
            <LabelWithHint label="Фамилия" hint="До 50 символов" />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Введите фамилию"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={50}
            />
          </div>
          <div>
            <LabelWithHint label="Никнейм" hint="5-20 символов, буквы, цифры и _" />
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите никнейм"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
              maxLength={21}
            />
          </div>
          <div>
            <LabelWithHint label="Телефон" hint="+380 (99) 123-45-67 или +7 (999) 123-45-67" />
            <input
              type="tel"
              value={formatPhoneValue(phone)}
              onChange={(e) => setPhone(parsePhoneToE164(e.target.value))}
              placeholder="Введите номер телефона"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
            />
          </div>
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Страна</label>
            <button
              type="button"
              onClick={() => setShowCountryMenu(!showCountryMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3">
                {COUNTRIES.find((c) => c.code === country)?.flag ? (
                  <img
                    src={COUNTRIES.find((c) => c.code === country)?.flag ?? ''}
                    alt=""
                    className="w-5 h-4 object-cover rounded-sm shrink-0"
                  />
                ) : (
                  <Globe className="w-5 h-4 shrink-0 text-white/50" />
                )}
                <span className="text-left">{COUNTRIES.find((c) => c.code === country)?.name || 'Выберите страну'}</span>
              </div>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showCountryMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showCountryMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCountryMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountryMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-3 ${
                        country === c.code
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {c.flag ? (
                        <img src={c.flag} alt="" className="w-5 h-4 object-cover rounded-sm shrink-0" />
                      ) : (
                        <Globe className="w-5 h-4 shrink-0 text-white/50" />
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div>
            <LabelWithHint label="Дата рождения" hint="Только для пользователей 18+" />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 [color-scheme:dark]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Почта</label>
            <div className="flex flex-wrap items-stretch gap-2 sm:gap-3">
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="flex-1 min-w-0 sm:min-w-[200px] px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-xs sm:text-base text-white/70 cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleConfirmEmail}
                disabled={emailConfirming || emailVerified}
                className={`px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 self-stretch ${
                  emailVerified
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 opacity-100'
                    : 'bg-white/10 hover:bg-white/15 text-white disabled:opacity-50'
                }`}
              >
                {emailVerified ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Подтверждена
                  </>
                ) : emailConfirming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                    Подтверждение...
                  </>
                ) : 'Подтвердить'}
              </button>
            </div>
            {emailVerified && <p className="mt-1 text-xs text-emerald-400/80">Email успешно подтверждён</p>}
          </div>

          {/* Часовой пояс */}
          <div className="relative">
            <LabelWithHint label="Часовой пояс" hint="Для корректного отображения времени сделок" />
            <button
              type="button"
              onClick={() => setShowTimezoneMenu(!showTimezoneMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <span className="text-left">{TIMEZONES.find((t) => t.value === timezone)?.label || 'Киев (UTC+2)'}</span>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showTimezoneMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showTimezoneMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTimezoneMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {TIMEZONES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        handleTimezoneChange(t.value);
                        setShowTimezoneMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                        timezone === t.value
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Язык интерфейса */}
          <div className="relative">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 sm:mb-2">Язык интерфейса</label>
            <button
              type="button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50 flex items-center justify-between gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={LANGUAGES.find((l) => l.code === lang)?.flag || '/images/flags/ru.svg'}
                  alt=""
                  className="w-5 h-4 object-cover rounded-sm shrink-0"
                />
                <span className="text-left">{LANGUAGES.find((l) => l.code === lang)?.label || 'Русский'}</span>
              </div>
              <svg className={`w-4 h-4 shrink-0 text-white/50 transition-transform duration-200 ${showLanguageMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showLanguageMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1a2e] border border-white/[0.08] rounded-xl shadow-xl py-2 max-h-[280px] overflow-y-auto scrollbar-dropdown z-50">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        handleLangChange(l.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors flex items-center gap-3 ${
                        lang === l.code
                          ? 'bg-[#3347ff]/25 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <img src={l.flag} alt="" className="w-5 h-4 object-cover rounded-sm shrink-0" />
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex sm:justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
            </div>
          </div>
        </div>

        {/* Верификация */}
        <div id="verification" className="mt-6 p-6 sm:p-8 rounded-xl bg-[#030E28]">
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-1">Верификация</h2>
          <p className="text-sm text-white/60 mb-6">Подтвердите личность для повышения лимитов и ускорения вывода средств</p>
          <VerificationSection />
        </div>

        <SecuritySection profile={profile} onProfileUpdate={(p) => { setProfile(prev => { const merged = prev ? { ...prev, ...p } : null; if (merged) onProfileUpdate?.(merged); return merged; }); }} />

        {/* Удаление аккаунта */}
        <div className="mt-6 p-6 sm:p-8 rounded-xl bg-[#030E28]">
          <p className="text-xs sm:text-sm font-medium text-white/50 mb-1.5 sm:mb-2">Опасная зона</p>
          <p className="text-[11px] sm:text-xs text-white/40 mb-3 sm:mb-4">Удаление аккаунта необратимо. Все данные будут удалены.</p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider border border-red-500/20 transition-colors"
            aria-label="Удалить аккаунт безвозвратно"
          >
            Удалить аккаунт
          </button>
        </div>
        </div>

        {/* Правая колонка - виджеты (скрыта на мобилке) */}
        <div className="hidden md:flex w-56 shrink-0 p-4 border-l border-white/10 flex-col gap-4 overflow-hidden bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f]">
          <div className="rounded-xl bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Заполненность профиля</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Прогресс</span>
                <span className="text-white font-semibold tabular-nums">{profileComplete}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#3347ff] rounded-full transition-all" style={{ width: `${profileComplete}%` }} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Заполните все поля для более полного профиля</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Надёжность аккаунта</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Уровень</span>
                <span className="text-white font-semibold tabular-nums">{trustPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${trustPercent}%` }} />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">2FA, телефон, ФИО и аватар повышают надёжность</p>
          </div>
        </div>
      </div>

      {/* Модалка удаления */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={closeDeleteModal}
            aria-hidden="true"
          />
          <div
            ref={deleteModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            aria-describedby="delete-modal-desc"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] max-w-md p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0f1a2e] border border-white/10 shadow-2xl"
          >
            <h3 id="delete-modal-title" className="text-base sm:text-lg font-semibold text-white mb-1.5 sm:mb-2">Удалить аккаунт</h3>
            <p id="delete-modal-desc" className="text-xs sm:text-sm text-white/60 mb-3 sm:mb-4">Это действие необратимо. Все данные будут удалены.</p>

            <p className="text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2">Укажите причину</p>
            <div className="space-y-2 mb-4">
              {[
                { value: 'other_platform', label: 'Перехожу на другую платформу' },
                { value: 'not_using', label: 'Не пользуюсь сервисом' },
                { value: 'privacy', label: 'Хочу удалить личные данные' },
                { value: 'difficult', label: 'Сложно разобраться в интерфейсе' },
                { value: 'other', label: 'Другая причина' },
              ].map((r, idx) => (
                <button
                  key={r.value}
                  type="button"
                  data-delete-modal-first={idx === 0 ? true : undefined}
                  onClick={() => setDeleteReason(r.value)}
                  className={`w-full text-left px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                    deleteReason === r.value
                      ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                      : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <p className="text-xs sm:text-sm font-medium text-white/80 mb-1.5 sm:mb-2">Введите пароль для подтверждения</p>
            {deleteError && <p className="mb-1.5 sm:mb-2 text-xs sm:text-sm text-red-400">{deleteError}</p>}
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 mb-3 sm:mb-4"
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                aria-label="Отменить удаление аккаунта"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
                aria-label={deleting ? 'Удаление аккаунта...' : 'Подтвердить удаление аккаунта'}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function ProfileSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const activeTab = searchParams.get('tab') || 'profile';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const copyIdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copyId = useCallback(() => {
    if (!profile?.id) return;
    if (copyIdTimeoutRef.current) clearTimeout(copyIdTimeoutRef.current);
    navigator.clipboard.writeText(profile.id);
    setIdCopied(true);
    copyIdTimeoutRef.current = setTimeout(() => {
      setIdCopied(false);
      copyIdTimeoutRef.current = null;
    }, 1500);
  }, [profile?.id]);

  const fetchData = () => {
    Promise.all([
      api<{ user: UserProfile }>('/api/user/profile'),
      api<AccountSnapshot>('/api/account/snapshot').catch(() => null),
    ]).then(([profileRes, snap]) => {
      setProfile(profileRes.user);
      setSnapshot(snap);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handler = () => fetchData();
    document.addEventListener('profile-updated', handler);
    document.addEventListener('wallet-updated', handler);
    return () => {
      document.removeEventListener('profile-updated', handler);
      document.removeEventListener('wallet-updated', handler);
    };
  }, []);

  const displayName = (() => {
    if (!profile) return 'Загрузка...';
    const first = profile.firstName?.trim();
    const last = profile.lastName?.trim();
    if (first && last) return `${first} ${last.charAt(0).toUpperCase()}.`;
    if (first) return first;
    return 'Гость';
  })();

  const countryCode = resolveCountryToCode(profile?.country);
  const countryName = COUNTRIES.find((c) => c.code === countryCode)?.name ?? profile?.country ?? '-';

  return (
    <aside className="hidden md:flex w-[300px] shrink-0 flex-col h-full overflow-hidden relative bg-[#051228] border-r border-white/[0.08]">

      {/* Верхний блок - аватар, имя, страна */}
      <div className="px-4 pt-6 pb-3 font-sans antialiased">
        <div className="flex flex-col items-start text-left w-full">
          <div className="flex items-center gap-4 w-full mb-4 pl-3.5">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60" />
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#051228] z-10" title="В сети" />
              {loading ? (
                <div className="relative w-16 h-16 rounded-full bg-white/10 animate-pulse" />
              ) : profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl.startsWith('/') ? profile.avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || ''}${profile.avatarUrl}`}
                  alt=""
                  className="relative w-16 h-16 rounded-full object-cover ring-2 ring-white/20 ring-offset-2 ring-offset-[#051228] shadow-lg"
                />
              ) : (
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-2xl font-bold text-white shadow-lg ring-2 ring-white/20 ring-offset-2 ring-offset-[#051228]">
                  {displayName === 'Гость' ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white/80">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  ) : displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <>
                  <div className="h-5 w-36 bg-white/10 rounded animate-pulse mb-2" />
                  <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white truncate tracking-tight">
                    {displayName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <ReactCountryFlag
                      countryCode={countryCode}
                      svg
                      style={{ width: '1em', height: '1em', borderRadius: '2px' }}
                      title={countryName}
                    />
                    <span className="text-sm font-normal text-white/70 truncate">{countryName}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Баланс - скруглённый блок */}
          <div className="w-full mb-4">
            <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#022766] to-[#051228] shadow-[inset_0_0_0_0.3px_#154594]">
              <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <img src="/images/wallet.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain" />
                      {loading ? (
                        <div className="h-3 w-8 bg-white/10 rounded animate-pulse" />
                      ) : (
                        <span className="text-xs font-medium text-[#84B2FF]">{snapshot?.currency ?? 'USD'}</span>
                      )}
                    </div>
                    {loading ? (
                      <div className="h-6 w-28 bg-white/10 rounded animate-pulse mt-0.5" />
                    ) : (
                      <span className="text-lg font-bold text-white tabular-nums">
                        {snapshot ? new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(snapshot.balance) : '-'}
                      </span>
                    )}
                  </div>
                <Link
                  href="/profile?tab=wallet"
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-[#3347ff]/30 hover:bg-[#3347ff]/50 text-[#84B2FF] hover:text-white transition-colors"
                  title="Пополнить"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>

          {/* Контактные данные */}
          <div className="w-full space-y-2.5 p-3.5">
            <div className="flex items-center gap-3 text-sm min-w-0">
              <img src="/images/hashtag.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
              {loading ? (
                <div className="h-3.5 w-32 bg-white/10 rounded animate-pulse" />
              ) : (
                <>
                  <span className="text-white/80 tabular-nums truncate min-w-0">
                    {profile?.id ? `ID ${profile.id}` : '-'}
                  </span>
                  {profile?.id && (
                    <button
                      type="button"
                      onClick={copyId}
                      className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      title={idCopied ? 'Скопировано' : 'Копировать ID'}
                      aria-label={idCopied ? 'Скопировано' : 'Копировать ID'}
                    >
                      {idCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <img src="/images/mail.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
              {loading ? (
                <div className="h-3.5 w-40 bg-white/10 rounded animate-pulse" />
              ) : (
                <span className="text-white/90 truncate min-w-0" title={profile?.email}>
                  {profile?.email || '-'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <img src="/images/calendar.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
              {loading ? (
                <div className="h-3.5 w-24 bg-white/10 rounded animate-pulse" />
              ) : (
                <span className="text-white/70">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { month: 'short', year: 'numeric' }) : '-'}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Разделитель */}
      <div className="px-4 mt-4">
        <div className="h-px bg-gradient-to-r from-transparent via-[#3347ff]/40 to-transparent" />
      </div>

      {/* Навигация - РАЗДЕЛЫ */}
      <div className="flex-1 mt-6 px-4">
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
          РАЗДЕЛЫ
        </p>
        <nav className="space-y-2">
          {SIDEBAR_ITEMS.map(({ id, label, href, iconSrc }) => {
            const isActive = activeTab === id;
            return (
              <Link
                key={id}
                href={href}
                className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium uppercase tracking-wider transition-all duration-200 overflow-hidden ${
                  isActive
                    ? 'bg-white/[0.07] text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#3347ff]" aria-hidden />
                )}
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <img src={iconSrc} alt="" className="w-4 h-4 object-contain" />
                </div>
                <span>{label.toUpperCase()}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Выход */}
      <div className="p-4 mt-auto border-t border-white/[0.08]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-all duration-200 text-xs font-medium uppercase tracking-wider"
        >
          <img src="/images/exit1.png" alt="" className="w-3.5 h-3.5 object-contain" />
          Выйти из аккаунта
        </button>
      </div>
    </aside>
  );
}

function ProfileBottomNav() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-gradient-to-t from-[#04101f] via-[#05122a] to-[#071430]">
      {SIDEBAR_ITEMS.map(({ id, shortLabel, href, iconSrc }) => {
        const isActive = activeTab === id;
        return (
          <Link
            key={id}
            href={href}
            className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[64px] transition-all duration-200 ${
              isActive ? 'text-[#7b8fff]' : 'text-white/45 hover:text-white/70'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#3347ff]" aria-hidden />
            )}
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-[#3347ff]/20' : 'bg-transparent'}`}>
              <img src={iconSrc} alt="" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-[10px] font-semibold leading-tight tracking-wide">{shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  return (
    <AuthGuard>
      <div className="h-[100dvh] max-h-[100dvh] md:h-screen md:max-h-screen flex flex-col overflow-hidden bg-[#061230]">
        <AppHeader />
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <ProfileSidebar />
          <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex pb-[calc(3.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {activeTab === 'profile' && <PersonalProfileTab />}
            {activeTab === 'wallet' && <WalletTab />}
            {activeTab === 'trade' && <TradeProfileTab />}
            {activeTab === 'support' && <SupportTab />}
          </main>
        </div>
        <ProfileBottomNav />
      </div>
    </AuthGuard>
  );
}