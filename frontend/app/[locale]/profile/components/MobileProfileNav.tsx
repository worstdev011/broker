'use client';

import { User, Wallet, ChartLineUp, Question } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';

type ProfileTab = 'profile' | 'wallet' | 'trade' | 'support';

interface MobileProfileNavProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

export function MobileProfileNav({ activeTab, onTabChange }: MobileProfileNavProps) {
  const tc = useTranslations('common');
  const tNav = useTranslations('terminal.nav');

  const NAV_ITEMS = [
    { id: 'profile' as ProfileTab, label: tc('profile'), Icon: User },
    { id: 'wallet' as ProfileTab, label: tc('wallet'), Icon: Wallet },
    { id: 'trade' as ProfileTab, label: tNav('trading'), Icon: ChartLineUp },
    { id: 'support' as ProfileTab, label: tc('support'), Icon: Question },
  ];

  return (
    <div
      className="shrink-0 bg-[#05122a] border-t border-white/10 flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }, index) => {
        const isActive = activeTab === id;
        const isLast = index === NAV_ITEMS.length - 1;
        const baseClass = `flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors ${
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
            <button type="button" onClick={() => onTabChange(id)} className={baseClass}>
              {inner}
            </button>
            {!isLast && (
              <div className="self-center h-5 w-px shrink-0 bg-white/[0.08]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
