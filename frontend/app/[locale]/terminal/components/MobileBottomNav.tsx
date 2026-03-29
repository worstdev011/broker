'use client';

import { ClockCounterClockwise, Newspaper, ChartLineUp, Wallet, UserCircle } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/navigation';

type MobileTab = 'chart' | 'history' | 'news' | 'trade' | 'wallet' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tNav = useTranslations('terminal.nav');
  const tc = useTranslations('common');

  const NAV_ITEMS = [
    { id: 'history' as MobileTab, label: tNav('history'), Icon: ClockCounterClockwise },
    { id: 'news' as MobileTab, label: tNav('news'), Icon: Newspaper },
    { id: 'trade' as MobileTab, label: tNav('trading'), href: '/profile?tab=trade', Icon: ChartLineUp },
    { id: 'wallet' as MobileTab, label: tc('wallet'), href: '/profile?tab=wallet', Icon: Wallet },
    { id: 'profile' as MobileTab, label: tc('profile'), href: '/profile', Icon: UserCircle },
  ];

  return (
    <div
      className="shrink-0 bg-[#05122a] border-t border-white/10 flex items-stretch"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      {NAV_ITEMS.map(({ id, label, href, Icon }, index) => {
        const isActive = activeTab === id;
        const isLast = index === NAV_ITEMS.length - 1;
        const baseClass = `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
          isActive ? 'text-white' : 'text-white/35 hover:text-white/70'
        }`;

        const inner = (
          <>
            <div className="relative">
              <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
              {isActive && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#3347ff]" />
              )}
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </>
        );

        return (
          <div key={id} className="flex-1 flex items-stretch">
            {href ? (
              <Link href={href} className={baseClass}>{inner}</Link>
            ) : (
              <button type="button" onClick={() => onTabChange(id)} className={baseClass}>
                {inner}
              </button>
            )}
            {!isLast && (
              <div className="self-center h-5 w-px shrink-0 bg-white/[0.08]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
