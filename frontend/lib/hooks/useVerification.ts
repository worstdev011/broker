'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api/api';

export const VERIFICATION_STORAGE_KEY = 'profile-verification-status';

export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

function readLocalStatus(): VerificationStatus {
  if (typeof window === 'undefined') return 'none';
  const v = localStorage.getItem(VERIFICATION_STORAGE_KEY);
  if (v === 'verified' || v === 'pending' || v === 'rejected') return v;
  return 'none';
}

/**
 * Returns the user's KYC verification status.
 *
 * Strategy:
 * 1. Reads localStorage immediately (no flash, instant render).
 * 2. Validates against the server on mount - server is the source of truth.
 * 3. Listens for cross-tab storage events and `profile-updated` custom events
 *    (dispatched by VerificationTab when Sumsub calls back in the browser).
 */
export function useVerificationStatus(): VerificationStatus {
  const [status, setStatus] = useState<VerificationStatus>(readLocalStatus);

  useEffect(() => {
    let cancelled = false;

    api<{ user: { kycStatus?: string | null } }>('/api/user/profile')
      .then(res => {
        if (cancelled) return;
        const s = res.user.kycStatus;
        if (s === 'verified' || s === 'pending' || s === 'rejected') {
          setStatus(s);
          localStorage.setItem(VERIFICATION_STORAGE_KEY, s);
        } else {
          setStatus('none');
          localStorage.removeItem(VERIFICATION_STORAGE_KEY);
        }
      })
      .catch(() => {
        // Keep localStorage value on network error
      });

    const handleStorage = () => {
      if (!cancelled) setStatus(readLocalStatus());
    };

    const handleProfileUpdate = (e: Event) => {
      if (cancelled) return;
      const detail = (e as CustomEvent<{ kycStatus?: string }>).detail;
      const s = detail?.kycStatus;
      if (s === 'verified' || s === 'pending' || s === 'rejected') {
        setStatus(s);
        localStorage.setItem(VERIFICATION_STORAGE_KEY, s);
      }
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('profile-updated', handleProfileUpdate as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('profile-updated', handleProfileUpdate as EventListener);
    };
  }, []);

  return status;
}

export function useIsVerified(): boolean {
  return useVerificationStatus() === 'verified';
}
