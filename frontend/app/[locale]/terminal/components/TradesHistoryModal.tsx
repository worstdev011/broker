'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChartBar, X } from '@phosphor-icons/react';
import { api } from '@/lib/api/api';
import { logger } from '@/lib/logger';
import { useAccountStore } from '@/stores/account.store';
import { TradeCard } from './TradeCard';
import type { TradeHistoryItem } from '@/types/trade';

const TRADES_PAGE_SIZE = 25;

export function TradesHistoryModal({ onClose, refreshTrigger }: { onClose: () => void; refreshTrigger?: number }) {
  const [filter, setFilter] = useState<'active' | 'closed'>('closed');
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tradesCountRef = useRef<number>(0);
  tradesCountRef.current = trades.length;
  const snapshot = useAccountStore((s) => s.snapshot);
  const displayCurrency = snapshot?.currency ?? 'USD';

  const loadTrades = useCallback(async (offset: number, append: boolean) => {
    const status = filter === 'active' ? 'open' : 'closed';
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      const response = await api<{ trades: TradeHistoryItem[]; hasMore: boolean }>(
        `/api/trades?limit=${TRADES_PAGE_SIZE}&offset=${offset}&status=${status}`
      );
      const newTrades = response.trades || [];
      setTrades((prev) => (append ? [...prev, ...newTrades] : newTrades));
      setHasMore(response.hasMore ?? false);
    } catch (error) {
      logger.error('Failed to fetch trades:', error);
      if (!append) setTrades([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    setTrades([]);
    setHasMore(true);
    loadTrades(0, false);
  }, [loadTrades]);

  // Обновляем список когда открывается новая сделка
  useEffect(() => {
    if (refreshTrigger && filter === 'active') {
      loadTrades(0, false);
    }
  }, [refreshTrigger, filter, loadTrades]);

  useEffect(() => {
    if (filter === 'active') {
      const interval = setInterval(() => {
        const now = new Date();
        setCurrentTime(now);
        const hasExpired = trades.some(
          (t) => t.status === 'OPEN' && new Date(t.expiresAt).getTime() <= now.getTime()
        );
        if (hasExpired) {
          setTimeout(() => loadTrades(0, false), 1200);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [filter, trades, loadTrades]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      scrollContainer.classList.add('scrolling');

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        scrollContainer.classList.remove('scrolling');
      }, 1000);

      if (!loading && !loadingMore && hasMore) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        if (scrollHeight - scrollTop - clientHeight < 100) {
          loadTrades(tradesCountRef.current, true);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loading, loadingMore, hasMore, loadTrades]);

  const getDateKey = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateDisplay = (dateKey: string) => {
    const [y, m, d] = dateKey.split('-');
    return `${d}.${m}.${y!.slice(-2)}`;
  };

  const groupedByDate = trades.reduce<Record<string, TradeHistoryItem[]>>((acc, trade) => {
    const key = getDateKey(trade.openedAt || trade.closedAt || '');
    if (!acc[key]) acc[key] = [];
    acc[key].push(trade);
    return acc;
  }, {});
  const dateKeys = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="fixed left-0 top-[53px] sm:top-[69px] bottom-[max(4.5rem,calc(4.5rem+env(safe-area-inset-bottom)))] z-50 w-full md:static md:h-full md:w-[330px] md:z-auto md:bottom-auto md:top-auto bg-[#0a1635] border-r border-white/10 shadow-2xl flex flex-col">
      <div className="px-5 pt-4 shrink-0 border-b border-white/10">
        <div className="relative">
          <div className="flex pr-11 md:pr-0">
            <button
              type="button"
              onClick={() => setFilter('active')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === 'active' ? 'text-white border-[#3347ff]' : 'text-gray-400 border-transparent md:hover:text-white'
              }`}
            >
              Активные
            </button>
            <button
              type="button"
              onClick={() => setFilter('closed')}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                filter === 'closed' ? 'text-white border-[#3347ff]' : 'text-gray-400 border-transparent md:hover:text-white'
              }`}
            >
              Закрытые
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden absolute top-0 right-0 w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 active:bg-white/10 -mt-0.5 -mr-1"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 scrollbar-hide-on-idle">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Загрузка...</div>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-sm">
              {filter === 'active' ? 'Нет активных сделок' : 'Нет закрытых сделок'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {dateKeys.map((dateKey) => (
              <div key={dateKey} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 py-1">
                  <span className="flex-1 h-px bg-white/20" />
                  <span className="text-xs text-gray-400 shrink-0">{formatDateDisplay(dateKey)}</span>
                  <span className="flex-1 h-px bg-white/20" />
                </div>
                {groupedByDate[dateKey].map((trade) => (
                  <TradeCard
                    key={trade.id}
                    trade={trade}
                    currentTime={currentTime}
                    isExpanded={expandedTradeId === trade.id}
                    onToggle={() => setExpandedTradeId((id) => (id === trade.id ? null : trade.id))}
                    currency={displayCurrency}
                  />
                ))}
              </div>
            ))}
            {loadingMore && (
              <div className="flex justify-center py-3">
                <div className="text-xs text-gray-400">Загрузка...</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer - статистика */}
      <div className="shrink-0 px-4 py-3 border-t border-white/10">
        <Link
          href="/profile?tab=trade"
          className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white text-sm font-semibold transition-all md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 shadow-md shadow-[#3347ff]/20"
        >
          <ChartBar className="w-4 h-4 shrink-0" weight="fill" />
          Показать статистику
        </Link>
      </div>
    </div>
  );
}
