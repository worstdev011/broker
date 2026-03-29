'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Wallet, CaretDown } from '@phosphor-icons/react';
import { Link } from '@/components/navigation';
import { getAvatarUrl } from '@/lib/avatarUrl';
import { formatCurrencySymbol } from '@/lib/formatCurrency';

interface MobileHeaderProps {
  avatarUrl: string | null;
  avatarInitial: string;
  isGuest: boolean;
  accountType: 'demo' | 'real';
  displayedBalance: string;
  hideBalance: boolean;
  balanceAnimation: 'increase' | 'decrease' | null;
  snapshotCurrency?: string;
  onProfileClick: () => void;
  onBalanceClick: () => void;
}

export function MobileHeader({
  avatarUrl,
  avatarInitial,
  isGuest,
  accountType,
  displayedBalance,
  hideBalance,
  balanceAnimation,
  snapshotCurrency,
  onBalanceClick,
}: MobileHeaderProps) {
  const tc = useTranslations('common');

  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 bg-[#05122a] border-b border-white/10"
      style={{
        height: '60px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Left: Logo */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center">
        <Image
          src="/images/logo.png"
          alt="Comfortrade"
          width={32}
          height={32}
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Center: avatar + account label + balance — shifted right */}
      <div className="flex-1 flex items-center justify-end pr-3 min-w-0">
      <button
        type="button"
        onClick={onBalanceClick}
        className="flex items-center gap-2.5 min-w-0"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#05122a] z-10 ${
            accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-500'
          }`} />
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60 pointer-events-none" />
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#05122a] flex items-center justify-center bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45]">
            {avatarUrl ? (
              <img src={getAvatarUrl(avatarUrl) ?? undefined} alt="" className="w-full h-full object-cover rounded-full" />
            ) : isGuest ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            ) : (
              <span className="text-sm font-bold text-white">{avatarInitial}</span>
            )}
          </div>
        </div>

        {/* Account + balance */}
        <div className="flex flex-col items-start min-w-0">
          <span className="flex items-center gap-1 text-[11px] text-white/50 leading-none mb-0.5">
            {accountType === 'demo' ? tc('demo_account') : tc('real_account')}
            <CaretDown className="w-2.5 h-2.5 text-white/40" weight="bold" />
          </span>
          <span
            className={`text-[17px] font-bold leading-tight tabular-nums transition-colors duration-500 ${
              hideBalance
                ? 'text-white'
                : balanceAnimation === 'increase'
                ? 'text-green-400'
                : balanceAnimation === 'decrease'
                ? 'text-red-400'
                : 'text-white'
            }`}
          >
            {hideBalance
              ? '••••••'
              : snapshotCurrency
              ? `${displayedBalance} ${formatCurrencySymbol(snapshotCurrency)}`
              : '...'}
          </span>
        </div>
      </button>
      </div>

      {/* Right: Wallet */}
      <Link
        href="/profile?tab=wallet"
        className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-[#3347ff] text-white"
      >
        <Wallet className="w-5 h-5" weight="fill" />
      </Link>
    </header>
  );
}
