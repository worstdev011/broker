'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from '@phosphor-icons/react';
import { useRouter } from '@/components/navigation';

type ProfileTab = 'profile' | 'wallet' | 'trade' | 'support';

interface MobileProfileHeaderProps {
  activeTab: ProfileTab;
}

export function MobileProfileHeader({ activeTab }: MobileProfileHeaderProps) {
  const router = useRouter();
  const tc = useTranslations('common');
  const tNav = useTranslations('terminal.nav');

  const tabLabel = (tab: ProfileTab) => {
    if (tab === 'trade') return tNav('trading');
    if (tab === 'support') return tc('support');
    if (tab === 'wallet') return tc('wallet');
    return tc('profile');
  };

  return (
    <header
      className="shrink-0 flex items-center justify-between px-3 bg-[#05122a] border-b border-white/10"
      style={{
        height: '60px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Left: back button */}
      <button
        type="button"
        onClick={() => router.push('/terminal')}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        aria-label={tc('back')}
      >
        <ArrowLeft className="w-5 h-5" weight="bold" />
      </button>

      {/* Center: tab title */}
      <span className="text-base font-semibold text-white">
        {tabLabel(activeTab as ProfileTab)}
      </span>

      {/* Right: logo */}
      <div className="w-9 h-9 flex items-center justify-center shrink-0">
        <Image
          src="/images/logo.png"
          alt="Comfortrade"
          width={28}
          height={28}
          className="h-7 w-auto object-contain"
        />
      </div>
    </header>
  );
}
