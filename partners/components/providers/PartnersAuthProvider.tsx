'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { partnersApi } from '@/lib/api/partners-api';
import type { PartnerPublicDTO } from '@/types/partners';

interface PartnersAuthContextValue {
  partner: PartnerPublicDTO | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshPartner: () => Promise<void>;
}

const PartnersAuthContext = createContext<PartnersAuthContextValue | null>(null);

const PUBLIC_PATHS = ['/', '/login', '/register'];

export function PartnersAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [partner, setPartner] = useState<PartnerPublicDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPartner = useCallback(async () => {
    try {
      const res = await partnersApi.me();
      setPartner(res.partner);
    } catch {
      setPartner(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) {
      // On login/register pages — just mark ready, don't fetch
      setIsLoading(false);
      return;
    }
    refreshPartner();
  }, [pathname, refreshPartner]);

  const logout = useCallback(async () => {
    try {
      await partnersApi.logout();
    } catch {
      // ignore
    }
    setPartner(null);
    router.replace('/login');
  }, [router]);

  const value = useMemo<PartnersAuthContextValue>(
    () => ({ partner, isLoading, logout, refreshPartner }),
    [partner, isLoading, logout, refreshPartner],
  );

  return (
    <PartnersAuthContext.Provider value={value}>
      {children}
    </PartnersAuthContext.Provider>
  );
}

export function usePartnersAuth(): PartnersAuthContextValue {
  const ctx = useContext(PartnersAuthContext);
  if (!ctx) throw new Error('usePartnersAuth must be used within PartnersAuthProvider');
  return ctx;
}
