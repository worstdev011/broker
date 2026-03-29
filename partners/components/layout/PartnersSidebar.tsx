'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    href: '/dashboard',
    label: 'Дашборд',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm9 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V4ZM2 13a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3Zm9 0a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3Z"/>
      </svg>
    ),
  },
  {
    href: '/referrals',
    label: 'Рефералы',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM15.22 15.126A4 4 0 0 0 10 12a4 4 0 0 0-5.22 3.126A.75.75 0 0 0 5.5 16h9a.75.75 0 0 0 .72-.874ZM18 16h-1.21a6 6 0 0 0-1.55-3.076A3.5 3.5 0 0 1 18 16ZM3.21 16A3.5 3.5 0 0 1 4.76 12.924 6 6 0 0 0 3.21 16H2a.75.75 0 0 0 .72.874H3.21Z"/>
      </svg>
    ),
  },
  {
    href: '/withdrawals',
    label: 'Выводы',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm0 5.5A.5.5 0 0 1 1.5 9h17a.5.5 0 0 1 0 1H14v4.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V10H1.5a.5.5 0 0 1-.5-.5Z" clipRule="evenodd"/>
      </svg>
    ),
  },
];

export function PartnersSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-d-surface border-r border-d-border">

      {/* Logo */}
      <Link href="/" className="flex h-16 items-center gap-3 px-6 border-b border-d-border select-none group">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
          <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
            <path d="M16.5 4L9 15.5H14L11.5 24L20 12.5H15L16.5 4Z" fill="#C5FF47" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="font-display font-black text-xs tracking-[0.2em] uppercase text-white">
            Partners
          </p>
          <p className="text-[10px] text-secondary tracking-widest uppercase">Кабинет</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted px-3 mb-3">
          Навигация
        </p>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={[
                'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-secondary hover:text-primary hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-accent shadow-[0_0_8px_rgba(197,255,71,0.8)]" />
              )}
              <span className={active ? 'text-accent' : 'text-muted'}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom badge */}
      <div className="p-4 border-t border-d-border">
        <div className="flex items-center gap-2 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(197,255,71,0.9)]" />
          <span className="text-xs text-secondary">Онлайн</span>
        </div>
      </div>
    </aside>
  );
}
