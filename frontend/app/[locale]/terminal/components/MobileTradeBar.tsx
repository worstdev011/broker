'use client';

import { useState, useRef, useEffect, forwardRef, useCallback, type MutableRefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, SlidersHorizontal } from '@phosphor-icons/react';
import { formatCurrencySymbol, formatGroupedBalanceAmount, getCurrencyIcon } from '@/lib/formatCurrency';
import { SentimentBar } from '@/components/chart/SentimentBar';

interface MobileTradeBarProps {
  /** Доля покупателей 0..1 с графика; иначе полоса залипает на 50/50 */
  sentimentBuyRatio?: number;
  time: string;
  amount: string;
  payoutPercent: number;
  currency: string;
  isTrading: boolean;
  onTrade: (direction: 'CALL' | 'PUT') => void;
  onTimeClick: () => void;
  onAmountClick: () => void;
  onSettingsClick: () => void;
  /** Called with the measured panel height so the chart can add padding */
  onHeightChange?: (height: number) => void;
  /** CSS pixels to lift the panel above the bottom edge (e.g. nav bar height) */
  bottomOffset?: number;
}

function formatTimeDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const MobileTradeBar = forwardRef<HTMLDivElement, MobileTradeBarProps>(function MobileTradeBar(
  {
    sentimentBuyRatio = 0.5,
    time,
    amount,
    payoutPercent,
    currency,
    isTrading,
    onTrade,
    onTimeClick,
    onAmountClick,
    onSettingsClick,
    onHeightChange,
    bottomOffset = 0,
  },
  forwardedRef,
) {
  const t = useTranslations('terminal');
  const timeSeconds = Number.parseInt(time || '60', 10);
  const amountNum = parseFloat(amount || '100');
  const profitNum = (amountNum * payoutPercent) / 100;
  const payoutTotalNum = amountNum + profitNum;

  const [buyPct, setBuyPct] = useState(50);
  const [sellPct, setSellPct] = useState(50);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const setPanelRef = useCallback(
    (el: HTMLDivElement | null) => {
      panelRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef)
        (forwardedRef as MutableRefObject<HTMLDivElement | null>).current = el;
    },
    [forwardedRef],
  );

  // Report panel height + bottomOffset to parent so the chart canvas reserves enough space
  useEffect(() => {
    const el = panelRef.current;
    if (!el || !onHeightChange) return;

    const ro = new ResizeObserver(() => {
      onHeightChange(el.offsetHeight + bottomOffset);
    });
    ro.observe(el);
    onHeightChange(el.offsetHeight + bottomOffset);
    return () => ro.disconnect();
  }, [onHeightChange, bottomOffset]);

  return (
    <div
      ref={setPanelRef}
      className="absolute left-0 right-0 z-10 pointer-events-auto mx-3 rounded-2xl"
      style={{
        bottom: bottomOffset,
        background: '#071428',
        border: '1px solid rgba(255,255,255,0.10)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* ── Sentiment strip ── */}
      <div className="px-4 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-green-400 tabular-nums w-7 text-right shrink-0 leading-none">
            {buyPct}%
          </span>
          <div className="flex-1 h-[6px] overflow-hidden min-w-0">
            <SentimentBar
              orientation="horizontal"
              height={6}
              externalBuyRatio={sentimentBuyRatio}
              onPercentagesChange={(buy, sell) => {
                setBuyPct(buy);
                setSellPct(sell);
              }}
            />
          </div>
          <span className="text-[10px] font-bold text-red-400 tabular-nums w-7 text-left shrink-0 leading-none">
            {sellPct}%
          </span>
        </div>
      </div>

      {/* ── Payout info ── */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <div className="flex flex-col items-start gap-0.5 min-w-0">
          <span className="text-[9px] text-white/35 uppercase tracking-wide leading-none">{t('mobile_payout')}</span>
          <span className="text-sm font-bold text-white leading-none tabular-nums">
            {formatGroupedBalanceAmount(payoutTotalNum)}{' '}
            <span className="text-[11px] text-white/50">{formatCurrencySymbol(currency)}</span>
          </span>
        </div>

        <div className="flex flex-col items-center shrink-0 mx-2">
          <span className="text-[22px] font-extrabold text-green-400 leading-none">+{payoutPercent}%</span>
          <span className="text-[9px] text-white/35 uppercase tracking-wide leading-none mt-0.5">
            {t('mobile_yield_lbl')}
          </span>
        </div>

        <div className="flex flex-col items-end gap-0.5 min-w-0">
          <span className="text-[9px] text-white/35 uppercase tracking-wide leading-none">{t('mobile_profit')}</span>
          <span className="text-sm font-bold text-green-400 leading-none tabular-nums">
            +{formatGroupedBalanceAmount(profitNum)}{' '}
            <span className="text-[11px] text-green-400/70">{formatCurrencySymbol(currency)}</span>
          </span>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-2 h-px bg-white/[0.06]" />

      {/* ── Controls: time + amount + settings ── */}
      <div className="px-4 pb-1 flex items-stretch gap-2 h-11">
        {/* Time */}
        <button
          type="button"
          onClick={onTimeClick}
          className="flex-1 flex items-center gap-2 rounded-xl px-3 min-w-0 bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.05] transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" weight="bold" />
          <div className="flex flex-col items-start min-w-0 gap-0.5">
            <span className="text-[8px] text-white/30 uppercase tracking-wide leading-none">{t('time_short')}</span>
            <span className="text-sm font-semibold text-white leading-none tabular-nums">
              {formatTimeDisplay(timeSeconds)}
            </span>
          </div>
        </button>

        {/* Amount */}
        <button
          type="button"
          onClick={onAmountClick}
          className="flex-1 flex items-center gap-2 rounded-xl px-3 min-w-0 bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.05] transition-colors"
        >
          <span className="text-white/40 font-bold shrink-0 leading-none">
            {getCurrencyIcon(currency)}
          </span>
          <div className="flex flex-col items-start min-w-0 gap-0.5">
            <span className="text-[8px] text-white/30 uppercase tracking-wide leading-none">{t('amount_short')}</span>
            <span className="text-sm font-semibold text-white leading-none tabular-nums truncate">
              {formatGroupedBalanceAmount(amountNum)}
            </span>
          </div>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onSettingsClick}
          className="w-11 shrink-0 flex items-center justify-center rounded-xl bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.05] transition-colors"
        >
          <SlidersHorizontal className="w-[17px] h-[17px] text-white/40" weight="bold" />
        </button>
      </div>

      {/* ── Trade buttons ── */}
      <div className="px-4 pt-2 pb-4 flex gap-2.5">
        <button
          type="button"
          disabled={isTrading}
          onClick={() => onTrade('CALL')}
          className="flex-1 py-[14px] rounded-2xl text-white font-extrabold text-[15px] tracking-widest uppercase disabled:opacity-50 active:scale-[0.97] transition-transform duration-100"
          style={{
            background: 'linear-gradient(145deg, #3fcc34 0%, #2db523 55%, #209817 100%)',
            boxShadow: '0 4px 16px rgba(46,181,36,0.35)',
          }}
        >
          {t('buy')}
        </button>
        <button
          type="button"
          disabled={isTrading}
          onClick={() => onTrade('PUT')}
          className="flex-1 py-[14px] rounded-2xl text-white font-extrabold text-[15px] tracking-widest uppercase disabled:opacity-50 active:scale-[0.97] transition-transform duration-100"
          style={{
            background: 'linear-gradient(145deg, #f03a22 0%, #d42814 55%, #b81f0c 100%)',
            boxShadow: '0 4px 16px rgba(212,40,20,0.35)',
          }}
        >
          {t('sell')}
        </button>
      </div>
    </div>
  );
});
