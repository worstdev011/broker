'use client';

import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
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
  const { displayName, isOTC } = getInstrumentDisplay(trade.instrument);
  const amount = parseFloat(trade.amount);
  const payout = parseFloat(trade.payout);
  const payoutAmount = amount * payout;
  const isWin = trade.status === 'WIN';
  const isOpen = trade.status === 'OPEN';
  const entryPrice = trade.entryPrice ? parseFloat(trade.entryPrice) : null;
  const exitPrice = trade.exitPrice ? parseFloat(trade.exitPrice) : null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  };

  const getTimeDisplay = () => {
    if (isOpen) {
      const expiresAt = new Date(trade.expiresAt);
      const now = currentTime || new Date();
      const diffMs = expiresAt.getTime() - now.getTime();
      if (diffMs > 0) {
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return '00:00:00';
    }
    return formatTime(trade.closedAt || trade.openedAt);
  };

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
      className="bg-[#1f2a45] rounded-lg p-4 flex flex-col gap-3 cursor-pointer transition-all md:hover:bg-[#1f2a45]/90"
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
        <span className="text-sm text-gray-300 font-mono">{getTimeDisplay()}</span>
      </div>

      {/* Payout % + amount */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">{Math.round(payout * 100)}%</span>
        <span className="text-sm text-white">-{fmtAmount(amount)}</span>
      </div>

      <div className="h-px bg-[#3B4657]" />

      {/* Result + direction */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">
          {isOpen ? '0.00' : isWin ? fmtAmount(payoutAmount) : '0.00'} {currency}
        </span>
        <div className="flex items-center gap-1">
          {trade.direction === 'CALL' ? (
            <ArrowUp className="w-4 h-4 text-green-400" />
          ) : (
            <ArrowDown className="w-4 h-4 text-red-400" />
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="pt-3 mt-1 border-t border-white/10 flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Точка входа</span>
            <span className="text-white font-medium">{entryPrice != null ? fmtPrice(entryPrice) : '—'}</span>
          </div>
          {!isOpen && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Точка выхода</span>
                <span className="text-white font-medium">{exitPrice != null ? fmtPrice(exitPrice) : '—'}</span>
              </div>
              {entryPrice != null && exitPrice != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Разница пунктов</span>
                  <span className={`font-medium ${exitPrice >= entryPrice ? 'text-green-400' : 'text-red-400'}`}>
                    {exitPrice >= entryPrice ? '+' : ''}{fmtPrice(exitPrice - entryPrice)}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Доходность</span>
            <span className="text-white">{Math.round(payout * 100)}%</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Сумма</span>
            <span className="text-white">{fmtAmount(amount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Направление</span>
            <span className={trade.direction === 'CALL' ? 'text-green-400' : 'text-red-400'}>
              {trade.direction === 'CALL' ? 'Вверх' : 'Вниз'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Открыта</span>
            <span className="text-white">{trade.openedAt ? new Date(trade.openedAt).toLocaleString('ru-RU') : '—'}</span>
          </div>
          {!isOpen && trade.closedAt && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Закрыта</span>
              <span className="text-white">{new Date(trade.closedAt).toLocaleString('ru-RU')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
