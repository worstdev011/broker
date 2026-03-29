'use client';

import { ArrowUp, ArrowDown, CaretDown } from '@phosphor-icons/react';
import ReactCountryFlag from 'react-country-flag';
import { useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { getInstrumentOrDefault } from '@/lib/instruments';
import type { TradeHistoryItem } from '@/types/trade';

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  EUR: 'EU',
  USD: 'US',
  GBP: 'GB',
  JPY: 'JP',
  AUD: 'AU',
  CAD: 'CA',
  CHF: 'CH',
  NZD: 'NZ',
  NOK: 'NO',
  UAH: 'UA',
  BTC: 'US',
  ETH: 'US',
  SOL: 'US',
  BNB: 'US',
};

function getCurrencyCountryCodes(pair: string): [string | null, string | null] {
  const parts = pair.split('/');
  if (parts.length !== 2) return [null, null];
  return [
    CURRENCY_TO_COUNTRY[parts[0]] ?? null,
    CURRENCY_TO_COUNTRY[parts[1]] ?? null,
  ];
}

function getInstrumentDisplay(instrumentId: string) {
  const info = getInstrumentOrDefault(instrumentId);
  const displayName = info.label.replace(' OTC', '').replace(' Real', '');
  const isOTC = !instrumentId.toUpperCase().includes('_REAL');
  return { displayName, isOTC };
}

interface TradeCardProps {
  trade: TradeHistoryItem;
  currentTime?: Date;
  isExpanded?: boolean;
  onToggle?: () => void;
  currency?: string;
}

export function TradeCard({ trade, currentTime, isExpanded, onToggle, currency = 'USD' }: TradeCardProps) {
  const t = useTranslations('terminal');
  const locale = useLocale();
  const localeTag = locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const { displayName, isOTC } = getInstrumentDisplay(trade.instrument);
  const amount = parseFloat(trade.amount);
  const payout = parseFloat(trade.payout);
  const payoutAmount = amount * payout / 100;
  const isWin = trade.status === 'WIN';
  const isOpen = trade.status === 'OPEN';
  const entryPrice = trade.entryPrice ? parseFloat(trade.entryPrice) : null;
  const exitPrice = trade.exitPrice ? parseFloat(trade.exitPrice) : null;

  const progressBarRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    const openedMs = new Date(trade.openedAt).getTime();
    const expiresMs = new Date(trade.expiresAt).getTime();
    const total = expiresMs - openedMs;

    const tick = () => {
      const nowMs = Date.now();

      if (progressBarRef.current && total > 0) {
        const pct = Math.min(100, Math.max(0, ((nowMs - openedMs) / total) * 100));
        progressBarRef.current.style.width = `${pct}%`;
      }

      if (timerRef.current) {
        const diffMs = expiresMs - nowMs;
        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          timerRef.current.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        } else {
          timerRef.current.textContent = '00:00:00';
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isOpen, trade.openedAt, trade.expiresAt]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const getInitialTimeDisplay = () => {
    if (isOpen) {
      const expiresAt = new Date(trade.expiresAt);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return '00:00:00';
    }
    return formatTime(trade.closedAt || trade.openedAt);
  };

  const getInitialProgress = () => {
    if (!isOpen) return null;
    const openedMs = new Date(trade.openedAt).getTime();
    const expiresMs = new Date(trade.expiresAt).getTime();
    const total = expiresMs - openedMs;
    if (total <= 0) return 100;
    return Math.min(100, Math.max(0, ((Date.now() - openedMs) / total) * 100));
  };

  const progressPct = getInitialProgress();

  const pair = displayName.split(' ')[0];
  const [country1, country2] = getCurrencyCountryCodes(pair);

  const fmtAmount = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPrice = (v: number) =>
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle?.()}
      className={`bg-[#1f2a45] rounded-lg p-2.5 flex flex-col gap-1.5 cursor-pointer transition-all hover:bg-[#1f2a45]/90 border-l-[3px] ${
        isOpen ? 'border-[#2478ff]' : isWin ? 'border-green-500' : 'border-red-500'
      }`}
    >
      {/* Instrument + time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            {country1 && (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 flex-shrink-0 flex items-center justify-center relative z-0">
                <ReactCountryFlag countryCode={country1} svg style={{ width: '20px', height: '20px', objectFit: 'cover', display: 'block' }} title={country1} />
              </div>
            )}
            {country2 && (
              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/60 flex-shrink-0 flex items-center justify-center relative z-10 -ml-2.5">
                <ReactCountryFlag countryCode={country2} svg style={{ width: '20px', height: '20px', objectFit: 'cover', display: 'block' }} title={country2} />
              </div>
            )}
          </div>
          <span className="text-sm text-white font-medium">
            {displayName} {isOTC ? 'OTC' : ''}
          </span>
        </div>
        {isOpen
          ? <span ref={timerRef} className="text-sm text-gray-300">{getInitialTimeDisplay()}</span>
          : <span className="text-sm text-gray-300">{getInitialTimeDisplay()}</span>
        }
      </div>

      {/* Payout % + amount */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{Math.round(payout)}%</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{currency}</span>
          <span className="text-sm text-white">{fmtAmount(amount)}</span>
        </div>
      </div>

      {progressPct !== null ? (
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            ref={progressBarRef}
            className="h-full rounded-full"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #2478ff, #38c4ff)',
            }}
          />
        </div>
      ) : (
        <div className="h-px bg-[#3B4657]" />
      )}

      {/* Result + direction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium ${isOpen ? 'text-blue-400' : isWin ? 'text-green-400' : 'text-red-400'}`}>
            {isOpen ? `+${fmtAmount(payoutAmount)}` : isWin ? `+${fmtAmount(payoutAmount)}` : `-${fmtAmount(amount)}`} {currency}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {trade.direction === 'CALL' ? (
            <ArrowUp className="w-4 h-4 text-green-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-red-400" />
          )}
          <CaretDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{t('trade_card_entry')}</span>
            <span className="text-white font-medium">{entryPrice != null ? fmtPrice(entryPrice) : '-'}</span>
          </div>
          {!isOpen && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">{t('trade_card_exit')}</span>
                <span className="text-white font-medium">{exitPrice != null ? fmtPrice(exitPrice) : '-'}</span>
              </div>
              {entryPrice != null && exitPrice != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{t('trade_card_points_diff')}</span>
                  <span className={`font-medium ${exitPrice >= entryPrice ? 'text-green-400' : 'text-red-400'}`}>
                    {exitPrice >= entryPrice ? '+' : ''}{fmtPrice(exitPrice - entryPrice)}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{t('trade_card_yield')}</span>
            <span className="text-white">{Math.round(payout)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{t('trade_card_amount')}</span>
            <span className="text-white">{fmtAmount(amount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{t('trade_card_direction')}</span>
            <span className={trade.direction === 'CALL' ? 'text-green-400' : 'text-red-400'}>
              {trade.direction === 'CALL' ? t('trade_card_up') : t('trade_card_down')}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">{t('trade_card_opened')}</span>
            <span className="text-white">{trade.openedAt ? new Date(trade.openedAt).toLocaleString(localeTag) : '-'}</span>
          </div>
          {!isOpen && trade.closedAt && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{t('trade_card_closed')}</span>
              <span className="text-white">{new Date(trade.closedAt).toLocaleString(localeTag)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
