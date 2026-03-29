'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api/api';

const STORAGE_KEY = 'profile-display-name';

export interface DisplayNameData {
  /** "Firstname L." | "Firstname" | "Гость" */
  displayName: string;
  /** First letter, uppercase. "Г" for guest */
  avatarInitial: string;
  /** True when name is still default (not set by user) */
  isGuest: boolean;
}

export function computeDisplayName(
  firstName?: string | null,
  lastName?: string | null,
): DisplayNameData {
  const first = firstName?.trim();
  const last = lastName?.trim();

  if (first && last) {
    return {
      displayName: `${first} ${last.charAt(0).toUpperCase()}.`,
      avatarInitial: first.charAt(0).toUpperCase(),
      isGuest: false,
    };
  }
  if (first) {
    return {
      displayName: first,
      avatarInitial: first.charAt(0).toUpperCase(),
      isGuest: false,
    };
  }
  return { displayName: 'Guest', avatarInitial: 'G', isGuest: true };
}

const GUEST_DEFAULT: DisplayNameData = { displayName: 'Guest', avatarInitial: 'G', isGuest: true };

function readFromStorage(): DisplayNameData {
  if (typeof window === 'undefined') return GUEST_DEFAULT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DisplayNameData;
  } catch {
    // ignore
  }
  return GUEST_DEFAULT;
}

/**
 * Returns display name derived from firstName + lastName.
 * Shows "Гость" until the user sets their name.
 * Reads localStorage immediately (no flash), then validates with server.
 * Listens to `profile-updated` custom event dispatched by the profile page on save.
 */
export function useDisplayName(): DisplayNameData {
  const t = useTranslations('common');
  const [data, setData] = useState<DisplayNameData>(readFromStorage);

  const localized = useMemo((): DisplayNameData => {
    if (!data.isGuest) return data;
    const label = t('guest');
    const initial = label.trim().charAt(0).toUpperCase() || 'G';
    return { ...data, displayName: label, avatarInitial: initial };
  }, [data, t]);

  useEffect(() => {
    let cancelled = false;

    api<{ user: { firstName?: string | null; lastName?: string | null } }>('/api/user/profile')
      .then((res) => {
        if (cancelled) return;
        const result = computeDisplayName(res.user.firstName, res.user.lastName);
        setData(result);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      })
      .catch(() => {});

    const handleProfileUpdate = (e: Event) => {
      if (cancelled) return;
      const detail = (e as CustomEvent<{ firstName?: string | null; lastName?: string | null }>).detail;
      const result = computeDisplayName(detail?.firstName, detail?.lastName);
      setData(result);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    };

    document.addEventListener('profile-updated', handleProfileUpdate as EventListener);
    return () => {
      cancelled = true;
      document.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
    };
  }, []);

  return localized;
}
