'use client';

import { usePartnersAuth } from '@/components/providers/PartnersAuthProvider';

export function PartnersTopBar() {
  const { partner, logout } = usePartnersAuth();

  return (
    <header className="h-16 bg-d-surface border-b border-d-border flex items-center justify-between px-6">
      {/* Left — greeting */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center text-accent text-xs font-black font-display">
          {partner?.email?.[0]?.toUpperCase() ?? 'P'}
        </div>
        <div>
          <p className="text-xs font-medium text-primary leading-none mb-0.5">
            {partner?.email ?? '—'}
          </p>
          <p className="text-[10px] text-muted leading-none">
            RevShare{' '}
            <span className="text-accent font-semibold">{partner?.revsharePercent ?? 0}%</span>
          </p>
        </div>
      </div>

      {/* Right — balance + logout */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] text-muted uppercase tracking-wider leading-none mb-0.5">Баланс</p>
          <p className="text-sm font-black font-display text-accent leading-none">
            {partner ? `${parseFloat(partner.balance).toFixed(2)} UAH` : '—'}
          </p>
        </div>

        <div className="w-px h-6 bg-d-border2" />

        <button
          onClick={() => void logout()}
          className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors group"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
            <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Выйти
        </button>
      </div>
    </header>
  );
}
