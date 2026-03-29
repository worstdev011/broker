'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePartnersAuth } from '@/components/providers/PartnersAuthProvider';

export function PartnersGuard({ children }: { children: ReactNode }) {
  const { partner, isLoading } = usePartnersAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !partner) {
      router.replace('/login');
    }
  }, [isLoading, partner, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-d-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin shadow-lime-sm" />
          <p className="text-[10px] text-muted uppercase tracking-[0.2em]">Partners</p>
        </div>
      </div>
    );
  }

  if (!partner) return null;

  return <>{children}</>;
}
