'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { TimeSelectionModal } from './TimeSelectionModal';
import { AmountCalculatorModal } from './AmountCalculatorModal';

type DrawerMode = 'time' | 'amount' | null;

/** Fallback до первого измерения ResizeObserver */
const FALLBACK_BOTTOM_NAV_PX = 56;

interface MobileTradeDrawerProps {
  mode: DrawerMode;
  onClose: () => void;
  timeSeconds: number;
  onTimeSelect: (seconds: number) => void;
  amount: number;
  onAmountSelect: (amount: number) => void;
  payoutPercent: number;
  currency: string;
  /**
   * Реальная высота нижнего таб-бара (включая safe-area внутри него), с родителя.
   * Фиксированные 56px + env(safe-area) давали лишний отступ на телефонах — модалка уезжала вверх.
   */
  bottomNavHeightPx: number;
  /**
   * offsetHeight панели сделок + bottomOffset (28): расстояние от низа main до верха панели.
   */
  tradeBarStackPx: number;
}

export function MobileTradeDrawer({
  mode,
  onClose,
  timeSeconds,
  onTimeSelect,
  amount,
  onAmountSelect,
  payoutPercent,
  currency,
  bottomNavHeightPx,
  tradeBarStackPx,
}: MobileTradeDrawerProps) {
  const t = useTranslations('terminal');
  const modalRef = useRef<HTMLDivElement>(null);
  const isOpen = mode !== null;

  useClickOutside(modalRef, onClose, isOpen);

  if (!isOpen) return null;

  const dialogLabel = mode === 'time' ? t('mobile_drawer_expiry') : t('mobile_drawer_amount');

  const navH = bottomNavHeightPx > 0 ? bottomNavHeightPx : FALLBACK_BOTTOM_NAV_PX;
  /** Низ модалки = верх торговой панели + небольшой зазор (без второго safe-area — он уже в высоте nav). */
  const modalBottomPx = navH + tradeBarStackPx + 8;
  const modalBottom = `${modalBottomPx}px`;

  const widthClass =
    mode === 'amount'
      ? 'w-[min(100vw-2rem,248px)]'
      : 'w-[min(100vw-2rem,238px)]';

  /** Время — слева над кнопкой времени, сумма — справа над кнопкой суммы (как в MobileTradeBar mx-3) */
  const hPosClass =
    mode === 'time'
      ? 'left-3 right-auto'
      : 'right-3 left-auto';

  return (
    <div
      ref={modalRef}
      className={`fixed z-[210] ${hPosClass} ${widthClass} max-h-[min(46vh,380px)] flex flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d1e3a] shadow-xl shadow-black/40 pointer-events-auto`}
      style={{ bottom: modalBottom }}
      role="dialog"
      aria-modal="true"
      aria-label={dialogLabel}
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {mode === 'time' && (
          <TimeSelectionModal
            compact
            currentSeconds={timeSeconds}
            onSelect={(s) => {
              onTimeSelect(s);
            }}
          />
        )}
        {mode === 'amount' && (
          <AmountCalculatorModal
            compact
            currentAmount={amount}
            onSelect={(a) => {
              onAmountSelect(a);
            }}
            payoutPercent={payoutPercent}
            currency={currency}
          />
        )}
      </div>
    </div>
  );
}
