import type { ReactNode } from 'react';
import { PartnersGuard } from '@/components/auth/PartnersGuard';
import { PartnersSidebar } from './PartnersSidebar';
import { PartnersTopBar } from './PartnersTopBar';

interface Props {
  children: ReactNode;
  title?: string;
}

export function PartnersLayout({ children, title }: Props) {
  return (
    <PartnersGuard>
      <div className="flex h-screen bg-d-bg overflow-hidden">
        <PartnersSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PartnersTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            {title && (
              <h1 className="font-display font-black italic text-white text-2xl mb-6 tracking-tight">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>
      </div>
    </PartnersGuard>
  );
}
