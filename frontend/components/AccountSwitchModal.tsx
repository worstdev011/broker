'use client';

import { Link } from '@/components/navigation';
import { PlusCircle } from '@phosphor-icons/react';
import { formatCurrencySymbol } from '@/lib/formatCurrency';

interface AccountSwitchModalProps {
  accountType: 'demo' | 'real';
  hideBalance: boolean;
  onHideBalanceToggle: () => void;
  modalBalances: {
    demo: { balance: string; currency: string } | null;
    real: { balance: string; currency: string } | null;
  };
  currentBalance: { balance: string; currency: string };
  snapshotType?: string;
  onSwitchAccount: (type: 'real' | 'demo') => void;
  onClose: () => void;
  demoLabel?: string;
  realLabel?: string;
  topupLabel?: string;
  hideBalanceLabel?: string;
}

export function AccountSwitchModal({
  accountType,
  hideBalance,
  onHideBalanceToggle,
  modalBalances,
  currentBalance,
  snapshotType,
  onSwitchAccount,
  onClose,
  demoLabel = 'Демо-счёт',
  realLabel = 'Реальный счёт',
  topupLabel = 'Пополнить',
  hideBalanceLabel = 'Скрыть баланс',
}: AccountSwitchModalProps) {
  const realBalanceDisplay = hideBalance
    ? '••••••'
    : modalBalances.real
      ? `${modalBalances.real.balance} ${formatCurrencySymbol(modalBalances.real.currency)}`
      : snapshotType === 'REAL'
        ? `${currentBalance.balance} ${formatCurrencySymbol(currentBalance.currency)}`
        : '...';

  const demoBalanceDisplay = hideBalance
    ? '••••••'
    : modalBalances.demo
      ? `${modalBalances.demo.balance} ${formatCurrencySymbol(modalBalances.demo.currency)}`
      : snapshotType === 'DEMO'
        ? `${currentBalance.balance} ${formatCurrencySymbol(currentBalance.currency)}`
        : '...';

  return (
    <>
      <div className="fixed inset-0 z-[140]" onClick={onClose} />
      <div className="absolute top-full right-0 left-auto mt-2 w-72 bg-[#0d1e3a] border border-white/[0.08] rounded-xl shadow-2xl z-[150] md:left-1/2 md:right-auto md:-translate-x-1/2" data-account-modal>
        <div className="p-3 space-y-2.5">
          <div
            className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'real' ? 'bg-white/[0.12]' : 'md:hover:bg-white/[0.08]'}`}
            onClick={() => { onSwitchAccount('real'); onClose(); }}
          >
            <div className="mt-0.5">
              {accountType === 'real'
                ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#0d1e3a]" /></div>
                : <div className="w-4 h-4 rounded-full border-2 border-[#4e60ff]" />}
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div>
                <div className="text-white font-medium mb-0.5 text-sm">{realLabel}</div>
                <div className="text-white/55 text-xs">{realBalanceDisplay}</div>
              </div>
              <Link href="/profile?tab=wallet" onClick={(e) => e.stopPropagation()} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#3347ff] hover:bg-[#2a3de0] text-white text-xs font-semibold transition-colors shadow-md shadow-[#3347ff]/20">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{topupLabel}</span>
              </Link>
            </div>
          </div>
          <div
            className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'demo' ? 'bg-white/[0.12]' : 'md:hover:bg-white/[0.08]'}`}
            onClick={() => { onSwitchAccount('demo'); onClose(); }}
          >
            <div className="mt-0.5">
              {accountType === 'demo'
                ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#0d1e3a]" /></div>
                : <div className="w-4 h-4 rounded-full border-2 border-[#4e60ff]" />}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium mb-0.5 text-sm">{demoLabel}</div>
              <div className="text-white/55 text-xs">{demoBalanceDisplay}</div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.08] p-3">
          <div className="flex items-center gap-2.5 cursor-pointer text-white/70 md:hover:text-white transition-colors" onClick={onHideBalanceToggle}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {hideBalance
                ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></>
                : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
            </svg>
            <span className="text-xs">{hideBalanceLabel}</span>
          </div>
        </div>
      </div>
    </>
  );
}
