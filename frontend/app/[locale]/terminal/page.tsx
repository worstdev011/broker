'use client';

import Image from 'next/image';
import { Link } from '@/components/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from '@/components/navigation';
import { TrendingUp, Wallet, GraduationCap, UserCircle, Bell, PlusCircle, Plus, Minus, History, Newspaper, Repeat, MessageCircle, ChevronsRight } from 'lucide-react';
import { useTerminalSnapshot } from '@/lib/hooks/useTerminalSnapshot';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';

import { ChartContainer } from '@/components/chart/ChartContainer';
import { SentimentBar } from '@/components/chart/SentimentBar';
import { IndicatorMenu } from '@/components/chart/IndicatorMenu';
import { DrawingMenu } from '@/components/chart/DrawingMenu';
import { ChartTypeMenu } from '@/components/chart/ChartTypeMenu';
import { TimeframeMenu } from '@/components/chart/TimeframeMenu';
import { InstrumentMenu } from '@/components/chart/InstrumentMenu';
import { OverlayPanel } from '@/components/chart/OverlayPanel';
import { useOverlayRegistry } from '@/components/chart/internal/overlay/useOverlayRegistry';
import { INSTRUMENTS, DEFAULT_INSTRUMENT_ID, getInstrumentOrDefault } from '@/lib/instruments';

import type { ChartType } from '@/components/chart/chart.types';
import type { CandleChartRef } from '@/components/chart/candle/CandleChart';
import type { LineChartRef } from '@/components/chart/line/LineChart';
import type { CandleMode } from '@/components/chart/internal/candleModes/candleMode.types';
import type { IndicatorConfig } from '@/components/chart/internal/indicators/indicator.types';
import { getAllIndicators } from '@/components/chart/internal/indicators/indicatorRegistry';
import { api } from '@/lib/api/api';
import { useAccountSwitch } from '@/lib/hooks/useAccountSwitch';
import { formatCurrencySymbol } from '@/lib/formatCurrency';
import { logger } from '@/lib/logger';
import {
  type TerminalLayout,
  saveLayoutToLocalStorage,
  loadLayoutFromLocalStorage,
  indicatorConfigToLayout,
  layoutIndicatorToConfig,
  drawingToLayout,
  layoutDrawingToDrawing,
} from '@/lib/terminalLayout';
import { debounce } from 'es-toolkit';
import { useAccountStore } from '@/stores/account.store';
import { toast as showToast } from '@/stores/toast.store';
import type { AccountSnapshot } from '@/types/account';
import { FALLBACK_SUPPORT_CHANNEL_URL } from '@/lib/constants';
import { CurrencyCountryModal } from '@/components/CurrencyCountryModal';
import { NewsModal } from './components/NewsModal';
import { ChartSettingsModal } from './components/ChartSettingsModal';
import { TimeSelectionModal } from './components/TimeSelectionModal';
import { AmountCalculatorModal } from './components/AmountCalculatorModal';
import { TradesHistoryModal } from './components/TradesHistoryModal';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

const VALID_TIMEFRAMES: Timeframe[] = ['5s', '10s', '15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'];

function formatTimeDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function TerminalPage() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { switchAccount } = useAccountSwitch();

  // Single read of saved layout — all state initializers use this object
  const initialLayoutRef = useRef<TerminalLayout | null>(
    typeof window !== 'undefined' ? loadLayoutFromLocalStorage() : null,
  );
  const il = initialLayoutRef.current;

  const [instrument, setInstrument] = useState<string>(il?.instrument ?? DEFAULT_INSTRUMENT_ID);
  const activeInstrumentRef = useRef<string>(instrument);
  useEffect(() => {
    activeInstrumentRef.current = instrument;
  }, [instrument]);

  const validInitTf: Timeframe = il?.timeframe && VALID_TIMEFRAMES.includes(il.timeframe as Timeframe)
    ? il.timeframe as Timeframe
    : '5s';
  const [timeframe, setTimeframe] = useState<Timeframe>(validInitTf);
  const [instrumentsData, setInstrumentsData] = useState<Array<{ id: string; payoutPercent: number }>>([]);
  const [payoutPercent, setPayoutPercent] = useState<number>(75);
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        const data = await api<Array<{ id: string; payoutPercent: number }>>('/api/instruments');
        setInstrumentsData(data);
        const currentInst = data.find((inst) => inst.id === instrument);
        if (currentInst) {
          setPayoutPercent(currentInst.payoutPercent);
        } else if (data.length > 0) {
          // Stale instrument ID (e.g. from old localStorage) — reset to default
          const fallback = data.find((inst) => inst.id === DEFAULT_INSTRUMENT_ID) ?? data[0]!;
          setInstrument(fallback.id);
          setPayoutPercent(fallback.payoutPercent);
        }
      } catch (error) {
        logger.error('Failed to load instruments:', error);
      }
    };
    loadInstruments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update payoutPercent when instrument changes
  useEffect(() => {
    const currentInst = instrumentsData.find((inst) => inst.id === instrument);
    if (currentInst) {
      setPayoutPercent(currentInst.payoutPercent);
    }
  }, [instrument, instrumentsData]);

  const [chartType, setChartType] = useState<ChartType>(il?.chartType === 'line' ? 'line' : 'candles');
  const { data } = useTerminalSnapshot(instrument);
  const [accountType, setAccountType] = useState<'demo' | 'real'>('demo');
  const [activeMenu, setActiveMenu] = useState<string>('торговля');
  const [time, setTime] = useState<string>(il?.tradeTime ?? '60');
  const [amount, setAmount] = useState<string>(il?.tradeAmount ?? '100');
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showAmountModal, setShowAmountModal] = useState<boolean>(false);
  const [isTrading, setIsTrading] = useState<boolean>(false);
  const timeFieldRef = useRef<HTMLDivElement>(null);
  const amountFieldRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(il?.soundEnabled ?? true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [hideBalance, setHideBalance] = useState<boolean>(il?.hideBalance ?? false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  
  const snapshot = useAccountStore((s) => s.snapshot);
  const [candleMode, setCandleMode] = useState<CandleMode>(
    il?.candleMode && ['classic', 'heikin_ashi', 'bars'].includes(il.candleMode)
      ? il.candleMode
      : 'classic',
  );
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>(getAllIndicators);
  const [drawingMode, setDrawingMode] = useState<'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow' | null>(null);
  const [followMode, setFollowMode] = useState<boolean>(true);
  const candleChartRef = useRef<CandleChartRef | null>(null);
  const lineChartRef = useRef<LineChartRef | null>(null);
  const [showReturnToLatest, setShowReturnToLatest] = useState<boolean>(false);
  useEffect(() => {
    const terminalSnapshot = data;
    if (!terminalSnapshot?.openTrades?.length || terminalSnapshot.instrument !== instrument) return;
    const openTrades = terminalSnapshot.openTrades;
    for (const t of openTrades) {
      const dto = {
        id: t.id,
        direction: t.direction,
        entryPrice: t.entryPrice,
        openedAt: t.openedAt ?? new Date(t.expiresAt - 60 * 1000).toISOString(),
        expiresAt: new Date(t.expiresAt).toISOString(),
        amount: t.amount,
      };
      candleChartRef.current?.addTradeOverlayFromDTO(dto);
      lineChartRef.current?.addTradeOverlayFromDTO(dto);
    }
  }, [data, instrument]);

  const [showTradesHistory, setShowTradesHistory] = useState<boolean>(false);
  const [showNews, setShowNews] = useState<boolean>(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (chartType === 'candles') {
        setShowReturnToLatest(!!candleChartRef.current?.shouldShowReturnToLatest?.());
      } else {
        setShowReturnToLatest(!!lineChartRef.current?.shouldShowReturnToLatest?.());
      }
    }, 400);
    return () => clearInterval(t);
  }, [chartType]);

  const [overlayVersion, setOverlayVersion] = useState(0);
  const onOverlayMutate = useCallback(() => setOverlayVersion((v) => v + 1), []);
  const overlayRegistry = useOverlayRegistry({ onMutate: onOverlayMutate });

  // ── Layout persistence ────────────────────────────────────────────
  // terminalLayoutRef is the single source of truth for what gets saved.
  // It's seeded from the initial load and kept in sync via per-field effects.
  const terminalLayoutRef = useRef<TerminalLayout>(il ?? {
    instrument: DEFAULT_INSTRUMENT_ID,
    timeframe: '5s',
    chartType: 'candles',
    candleMode: 'classic',
  });

  const saveLayoutDebounced = useRef(
    debounce(() => {
      saveLayoutToLocalStorage(terminalLayoutRef.current);
    }, 1000)
  ).current;

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveLayoutToLocalStorage(terminalLayoutRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveLayoutDebounced.cancel?.();
    };
  }, [saveLayoutDebounced]);

  // Restore drawings into whichever chart component is mounted
  const chartTypeRef = useRef(chartType);
  chartTypeRef.current = chartType;

  const restoreDrawingsToChart = useCallback((drawings: TerminalLayout['drawings']) => {
    if (!drawings || drawings.length === 0) return;
    let attempts = 0;
    const tryRestore = () => {
      attempts++;
      const ref = chartTypeRef.current === 'candles' ? candleChartRef.current : lineChartRef.current;
      if (ref) {
        ref.clearDrawings();
        drawings.forEach((ld) => {
          const drawing = layoutDrawingToDrawing(ld);
          if (drawing) ref.addDrawing(drawing);
        });
      } else if (attempts < 10) {
        setTimeout(tryRestore, 100);
      }
    };
    setTimeout(tryRestore, 100);
  }, []);

  // Restore indicators from saved layout (one-time on mount)
  useEffect(() => {
    if (il?.indicators && il.indicators.length > 0) {
      const allIndicators = getAllIndicators();
      const restoredConfigs = allIndicators.map((indicator) => {
        const saved = il.indicators!.find((x) => x.id === indicator.id);
        if (saved) return { ...indicator, ...layoutIndicatorToConfig(saved, indicator.type) };
        return indicator;
      });
      setIndicatorConfigs(restoredConfigs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore drawings for the initial instrument (one-time on mount)
  useEffect(() => {
    const drawings = il?.drawingsByInstrument?.[instrument];
    if (drawings) restoreDrawingsToChart(drawings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Per-field save effects ──────────────────────────────────────
  useEffect(() => {
    terminalLayoutRef.current.instrument = instrument;
    saveLayoutDebounced();
  }, [instrument, saveLayoutDebounced]);

  useEffect(() => {
    terminalLayoutRef.current.timeframe = timeframe;
    saveLayoutDebounced();
  }, [timeframe, saveLayoutDebounced]);

  useEffect(() => {
    terminalLayoutRef.current.indicators = indicatorConfigs
      .filter((c) => c.enabled)
      .map(indicatorConfigToLayout);
    saveLayoutDebounced();
  }, [indicatorConfigs, saveLayoutDebounced]);

  // Save drawings per-instrument from whichever chart is active
  useEffect(() => {
    const ref = chartType === 'candles' ? candleChartRef.current : lineChartRef.current;
    if (ref) {
      const drawings = ref.getDrawings();
      if (!terminalLayoutRef.current.drawingsByInstrument) {
        terminalLayoutRef.current.drawingsByInstrument = {};
      }
      terminalLayoutRef.current.drawingsByInstrument[instrument] = drawings.map(drawingToLayout);
      saveLayoutDebounced();
    }
  }, [overlayVersion, saveLayoutDebounced, chartType, instrument]);

  useEffect(() => {
    terminalLayoutRef.current.tradeTime = time;
    saveLayoutDebounced();
  }, [time, saveLayoutDebounced]);

  useEffect(() => {
    terminalLayoutRef.current.tradeAmount = amount;
    saveLayoutDebounced();
  }, [amount, saveLayoutDebounced]);

  useEffect(() => {
    terminalLayoutRef.current.soundEnabled = soundEnabled;
    saveLayoutDebounced();
  }, [soundEnabled, saveLayoutDebounced]);

  useEffect(() => {
    terminalLayoutRef.current.hideBalance = hideBalance;
    saveLayoutDebounced();
  }, [hideBalance, saveLayoutDebounced]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  useEffect(() => {
    const initSnapshot = async () => {
      try {
        const snap = await api<AccountSnapshot>('/api/account/snapshot');
        useAccountStore.getState().setSnapshot(snap);
      } catch (error) {
        logger.error('Failed to load account snapshot:', error);
      }
    };
    initSnapshot();
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await api<{ user: { avatarUrl?: string | null; currency?: string | null } }>('/api/user/profile');
      setAvatarUrl(response.user.avatarUrl || null);
      setUserCurrency(response.user.currency ?? null);
      if (!response.user.currency) {
        setShowCurrencyModal(true);
      }
    } catch (error) {
      logger.error('Failed to load user profile:', error);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (snapshot) {
      const newAccountType = snapshot.type === 'DEMO' ? 'demo' : 'real';
      if (accountType !== newAccountType) {
        setAccountType(newAccountType);
      }
    }
  }, [snapshot, accountType]);

  const [resetDemoLoading, setResetDemoLoading] = useState<boolean>(false);
  const [buyPercentage, setBuyPercentage] = useState<number>(50);
  const [sellPercentage, setSellPercentage] = useState<number>(50);
  const mainRef = useRef<HTMLElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const [balanceAnimation, setBalanceAnimation] = useState<'increase' | 'decrease' | null>(null);
  const [displayedBalance, setDisplayedBalance] = useState<string>('0.00');
  const previousBalanceRef = useRef<number | null>(null);

  // Animate balance changes
  useEffect(() => {
    if (!snapshot) {
      setDisplayedBalance('0.00');
      previousBalanceRef.current = null;
      return;
    }
    const currentBalance = snapshot.balance;
    const previousBalance = previousBalanceRef.current;

    if (previousBalance !== null && previousBalance !== currentBalance) {
      if (currentBalance > previousBalance) setBalanceAnimation('increase');
      else if (currentBalance < previousBalance) setBalanceAnimation('decrease');

      const startBalance = previousBalance;
      const endBalance = currentBalance;
      const duration = 500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = startBalance + (endBalance - startBalance) * easeOutCubic;
        setDisplayedBalance(current.toFixed(2));
        if (progress < 1) requestAnimationFrame(animate);
        else setDisplayedBalance(endBalance.toFixed(2));
      };
      requestAnimationFrame(animate);
      setTimeout(() => setBalanceAnimation(null), 1000);
    } else {
      setDisplayedBalance(currentBalance.toFixed(2));
    }
    previousBalanceRef.current = currentBalance;
  }, [snapshot?.balance, snapshot?.accountId]);

  const handleResetDemoAccount = async () => {
    if (!snapshot || snapshot.type !== 'DEMO') return;
    if (snapshot.balance >= 1000) return;
    try {
      setResetDemoLoading(true);
      await api('/api/accounts/demo/reset', { method: 'POST' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('high enough') || msg.includes('not allowed')) {
        showToast('Баланс демо-счета должен быть меньше $1,000 для сброса', 'warning');
      } else if (msg.includes('not found')) {
        showToast('Демо-счет не найден', 'error');
      } else {
        showToast(`Ошибка сброса демо-счета: ${msg}`, 'error');
      }
    } finally {
      setResetDemoLoading(false);
    }
  };

  const displayCurrency = snapshot?.currency ?? userCurrency ?? 'USD';

  const getCurrentBalance = () => {
    if (!snapshot) return { balance: '0.00', currency: userCurrency ?? 'USD' };
    return { balance: snapshot.balance.toFixed(2), currency: snapshot.currency };
  };

  const [modalBalances, setModalBalances] = useState<{
    demo: { balance: string; currency: string } | null;
    real: { balance: string; currency: string } | null;
  }>({ demo: null, real: null });

  const loadAllBalances = async () => {
    try {
      const accountsResponse = await api<{ accounts: Array<{ type: string; balance: string; currency: string; isActive: boolean }> }>('/api/accounts');
      const demoAccount = accountsResponse.accounts.find((a) => a.type === 'demo' && a.isActive) || accountsResponse.accounts.find((a) => a.type === 'demo');
      if (demoAccount) {
        setModalBalances((prev) => ({
          ...prev,
          demo: { balance: parseFloat(demoAccount.balance).toFixed(2), currency: demoAccount.currency },
        }));
      }
      try {
        const realResponse = await api<{ currency: string; balance: number }>('/api/wallet/balance');
        setModalBalances((prev) => ({
          ...prev,
          real: { balance: realResponse.balance.toFixed(2), currency: realResponse.currency },
        }));
      } catch {
        setModalBalances((prev) => ({ ...prev, real: null }));
      }
    } catch (error) {
      logger.error('Failed to load balances:', error);
    }
  };

  // Sync accountType from terminal snapshot on first load
  const accountTypeInitializedRef = useRef(false);
  useEffect(() => {
    if (data?.activeAccount?.type && !accountTypeInitializedRef.current) {
      setAccountType(data.activeAccount.type);
      accountTypeInitializedRef.current = true;
    }
  }, [data?.activeAccount?.type]);

  // Close account modal on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showAccountModal && !target.closest('[data-account-modal]')) {
        setShowAccountModal(false);
      }
    };
    if (showAccountModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAccountModal]);

  // ESC closes all modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAccountModal(false);
        setShowProfileModal(false);
        setShowTimeModal(false);
        setShowAmountModal(false);
        setShowChartSettingsModal(false);
        setShowNews(false);
        setShowTradesHistory(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  // Sync indicatorConfigs with overlay registry
  useEffect(() => {
    indicatorConfigs.forEach((c) => {
      if (c.enabled) {
        const name =
          c.type === 'Stochastic'
            ? `Stochastic(${c.period},${c.periodD ?? 3})`
            : c.type === 'BollingerBands'
              ? `Боллинджер(${c.period}, ${c.stdDevMult ?? 2})`
              : `${c.type}(${c.period})`;
        const params =
          c.type === 'Stochastic'
            ? { period: c.period, periodD: c.periodD ?? 3 }
            : c.type === 'BollingerBands'
              ? { period: c.period, stdDevMult: c.stdDevMult ?? 2 }
              : { period: c.period };
        overlayRegistry.addOverlay({
          id: c.id,
          type: 'indicator',
          name,
          visible: true,
          indicatorId: c.type,
          params,
        });
      } else {
        overlayRegistry.removeOverlay(c.id);
      }
    });
  }, [indicatorConfigs, overlayRegistry]);

  // Save current drawings before switching instrument, then restore drawings for new one
  const handleInstrumentChange = useCallback((newInstrument: string) => {
    // Save drawings from old instrument
    const ref = chartTypeRef.current === 'candles' ? candleChartRef.current : lineChartRef.current;
    if (ref) {
      if (!terminalLayoutRef.current.drawingsByInstrument) {
        terminalLayoutRef.current.drawingsByInstrument = {};
      }
      terminalLayoutRef.current.drawingsByInstrument[instrument] = ref.getDrawings().map(drawingToLayout);
    }

    setInstrument(newInstrument);

    // Restore drawings for new instrument
    const drawings = terminalLayoutRef.current.drawingsByInstrument?.[newInstrument];
    restoreDrawingsToChart(drawings ?? []);
  }, [instrument, restoreDrawingsToChart]);

  const handleChartTypeChange = (type: ChartType) => {
    // При смене типа графика сбрасываем режим рисования, чтобы
    // useDrawingInteractions не создавал новый прямоугольник на каждом переключении
    if (drawingMode !== null) {
      setDrawingMode(null);
    }

    // Save drawings from current chart type before switching
    const ref = chartTypeRef.current === 'candles' ? candleChartRef.current : lineChartRef.current;
    if (ref) {
      if (!terminalLayoutRef.current.drawingsByInstrument) {
        terminalLayoutRef.current.drawingsByInstrument = {};
      }
      terminalLayoutRef.current.drawingsByInstrument[instrument] = ref.getDrawings().map(drawingToLayout);
    }

    setChartType(type);
    terminalLayoutRef.current.chartType = type;
    saveLayoutDebounced();

    // Restore drawings to the new chart type after it mounts
    const drawings = terminalLayoutRef.current.drawingsByInstrument?.[instrument];
    if (drawings && drawings.length > 0) {
      // chartTypeRef will update synchronously since we called setChartType above
      // but the component needs time to mount, so use the retry mechanism
      let attempts = 0;
      const tryRestore = () => {
        attempts++;
        const newRef = type === 'candles' ? candleChartRef.current : lineChartRef.current;
        if (newRef) {
          newRef.clearDrawings();
          drawings.forEach((ld) => {
            const d = layoutDrawingToDrawing(ld);
            if (d) newRef.addDrawing(d);
          });
        } else if (attempts < 10) {
          setTimeout(tryRestore, 100);
        }
      };
      setTimeout(tryRestore, 150);
    }
  };

  const handleCandleModeChange = (mode: CandleMode) => {
    if (mode === candleMode) return;
    setCandleMode(mode);
    terminalLayoutRef.current.candleMode = mode;
    saveLayoutDebounced();
  };

  const getActiveAccountId = async (): Promise<string | null> => {
    try {
      const accountsResponse = await api<{ accounts: Array<{ id: string; type: string; isActive: boolean }> }>('/api/accounts');
      const activeAccount = accountsResponse.accounts.find((a) => a.isActive && a.type === accountType);
      if (activeAccount?.id) return activeAccount.id;

      const accountByType = accountsResponse.accounts.find((a) => a.type === accountType);
      if (accountByType?.id) {
        await api('/api/accounts/switch', {
          method: 'POST',
          body: JSON.stringify({ accountId: accountByType.id }),
        });
        return accountByType.id;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get active account ID:', error);
      return null;
    }
  };

  const handleFollowModeToggle = () => {
    const newFollowMode = !followMode;
    setFollowMode(newFollowMode);
    candleChartRef.current?.setFollowMode(newFollowMode);
  };

  const toggleFullscreen = async () => {
    const el = fullscreenContainerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await el.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      setIsFullscreen(!!document.fullscreenElement);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const openTrade = async (direction: 'CALL' | 'PUT') => {
    if (isTrading) return;
    setIsTrading(true);
    try {
      const accountId = await getActiveAccountId();
      if (!accountId) {
        showToast('Нет доступного счёта', 'error');
        return;
      }
      const amountNum = parseFloat(amount.replace(',', '.'));
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        showToast('Введите корректную сумму', 'error');
        return;
      }
      let expiration = parseInt(time, 10);
      if (!Number.isFinite(expiration)) expiration = 60;
      expiration = Math.min(300, Math.max(5, expiration));
      expiration = Math.round(expiration / 5) * 5;

      const res = await api<{
        trade: {
          id: string;
          direction: 'CALL' | 'PUT';
          amount: string;
          entryPrice: string;
          openedAt: string;
          expiresAt: string;
        };
      }>('/api/trades/open', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          direction,
          amount: amountNum,
          expirationSeconds: expiration,
          instrument,
        }),
      });

      candleChartRef.current?.addTradeOverlayFromDTO(res.trade);
      lineChartRef.current?.addTradeOverlayFromDTO(res.trade);
    } catch (e: any) {
      showToast(e?.message ?? 'Ошибка открытия сделки', 'error');
    } finally {
      setIsTrading(false);
    }
  };

  // Dynamic bottom offset for zoom buttons so they sit below the main price area
  // and above bottom indicators (RSI, MACD, etc.), moving together with the chart.
  const zoomBottomOffsetPx = useMemo(() => {
    if (chartType !== 'candles') {
      // For line chart we don't have bottom indicator panels yet
      return 8;
    }

    const overlays = overlayRegistry.getVisibleOverlays();
    const indicatorIds = new Set(
      overlays
        .filter((o) => o.type === 'indicator')
        .map((o: any) => o.indicatorId as string),
    );

    const hasRSI = indicatorIds.has('RSI');
    const hasStochastic = indicatorIds.has('Stochastic');
    const hasMomentum = indicatorIds.has('Momentum');
    const hasAwesomeOscillator = indicatorIds.has('AwesomeOscillator');
    const hasMACD = indicatorIds.has('MACD');
    const hasATR = indicatorIds.has('ATR');
    const hasADX = indicatorIds.has('ADX');

    const rsiHeight = hasRSI ? 120 : 0;
    const stochHeight = hasStochastic ? 120 : 0;
    const momentumHeight = hasMomentum ? 90 : 0;
    const awesomeOscillatorHeight = hasAwesomeOscillator ? 90 : 0;
    const macdHeight = hasMACD ? 100 : 0;
    const atrHeight = hasATR ? 80 : 0;
    const adxHeight = hasADX ? 80 : 0;

    const indicatorsTotal = rsiHeight + stochHeight + momentumHeight + awesomeOscillatorHeight + macdHeight + atrHeight + adxHeight;

    // Базовый отступ от нижней границы графика вверх, чуть выше индикаторов
    return 30 + indicatorsTotal;
  }, [chartType, overlayRegistry, overlayVersion]);

  return (
    <AuthGuard requireAuth>
      {/* Currency selection modal */}
      {showCurrencyModal && (
        <CurrencyCountryModal onComplete={() => { setShowCurrencyModal(false); loadUserProfile(); }} />
      )}
      <div ref={fullscreenContainerRef} className="terminal-page h-[100dvh] max-h-[100dvh] md:h-screen md:max-h-screen bg-[#061230] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#05122a] border-b border-white/10 shrink-0">
        <div className="px-3 sm:px-6 py-2 sm:py-3 md:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image src="/images/logo.png" alt="Comfortrade" width={40} height={40} className="h-8 sm:h-10 w-auto object-contain" />
            <span className="hidden sm:inline text-base sm:text-xl font-semibold text-white uppercase truncate max-w-[140px] sm:max-w-none">Comfortrade</span>
            <button type="button" className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center text-white md:hover:bg-white/10 transition-colors shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60 pointer-events-none" />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#05122a] z-10 pointer-events-none ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-500'}`} title={accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowProfileModal(!showProfileModal)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfileModal((v) => !v); } }}
                className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer md:hover:opacity-90 transition-opacity overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#05122a] shadow-lg"
                aria-label="Открыть меню профиля"
                aria-expanded={showProfileModal}
                aria-haspopup="menu"
              >
                {avatarUrl ? (
                  <img src={avatarUrl?.startsWith('/') ? avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-sm font-bold text-white">
                    {(user?.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {showProfileModal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileModal(false)} />
                  <div className="absolute left-full right-auto top-full mt-2 -ml-32 w-72 bg-[#091C56] border border-white/5 rounded-lg shadow-xl z-50 overflow-hidden md:left-1/2 md:ml-0 md:-translate-x-1/2">
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center gap-2.5 p-2.5 rounded-lg">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/20 ring-offset-2 ring-offset-[#1a2438] bg-gradient-to-br from-[#3347ff]/30 to-[#1f2a45]">
                          {avatarUrl ? <img src={avatarUrl?.startsWith('/') ? avatarUrl : `${process.env.NEXT_PUBLIC_API_URL || ''}${avatarUrl}`} alt="" className="w-full h-full object-cover rounded-full" /> : <span className="text-sm font-bold text-white">{(user?.email || '?').charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm truncate">{user?.email || 'Пользователь'}</div>
                          <div className="text-white/60 text-xs">{accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'}</div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/5 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-white/60 text-xs mb-0.5">Баланс</div>
                          <div className={`text-white font-semibold text-base ${hideBalance ? '' : balanceAnimation === 'increase' ? 'text-green-400' : balanceAnimation === 'decrease' ? 'text-red-400' : ''}`}>
                            {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
                          </div>
                        </div>
                        <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white text-xs font-semibold md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 transition-all shadow-lg shadow-[#3347ff]/20">
                          <PlusCircle className="w-4 h-4" />
                          <span>Пополнить</span>
                        </Link>
                      </div>
                    </div>
                    <div className="border-t border-white/10 p-3 space-y-1">
                      <button type="button" onClick={() => { setShowProfileModal(false); setShowAccountModal(true); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white md:hover:bg-white/10 transition-colors text-sm text-left">
                        <Repeat className="w-4 h-4" />
                        <span>Переключить счёт</span>
                      </button>
                      <Link href="/profile" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white md:hover:bg-white/10 transition-colors text-sm">
                        <UserCircle className="w-4 h-4" />
                        <span>Профиль</span>
                      </Link>
                      <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white md:hover:bg-white/10 transition-colors text-sm">
                        <Wallet className="w-4 h-4" />
                        <span>Кошелёк</span>
                      </Link>
                      <Link href="/profile?tab=support" onClick={() => setShowProfileModal(false)} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-white md:hover:bg-white/10 transition-colors text-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>Поддержка</span>
                      </Link>
                    </div>
                    <div className="border-t border-white/10 p-3">
                      <button onClick={() => { setShowProfileModal(false); handleLogout(); }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-red-400 md:hover:bg-red-500/10 transition-colors text-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Выйти</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {(snapshot?.type === 'DEMO' && snapshot && snapshot.balance < 1000) && (
                <button type="button" className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center md:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleResetDemoAccount} disabled={resetDemoLoading} title="Reset demo balance">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              )}
              <div className="flex flex-col relative pr-3" data-account-modal>
                <div className="flex items-center gap-1.5 cursor-pointer md:hover:opacity-80 transition-opacity" data-account-modal onClick={async () => { await loadAllBalances(); setShowAccountModal(true); }}>
                  <span className="text-xs text-white font-medium">{accountType === 'demo' ? 'Демо-счёт' : 'Реальный счёт'}</span>
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className={`text-base font-semibold transition-all duration-500 ${hideBalance ? 'text-white' : balanceAnimation === 'increase' ? 'text-green-400 scale-105' : balanceAnimation === 'decrease' ? 'text-red-400 scale-105' : 'text-white'}`} style={{ transition: 'color 0.5s ease, transform 0.3s ease' }}>
                  {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
                </div>
                {showAccountModal && (
                  <>
                    <div className="fixed inset-0 z-[140]" onClick={() => setShowAccountModal(false)} />
                    <div className="absolute top-full right-0 left-auto mt-2 w-72 bg-[#091C56] border border-white/5 rounded-lg shadow-xl z-[150] md:left-1/2 md:right-auto md:-translate-x-1/2" data-account-modal>
                      <div className="p-3 space-y-2.5">
                        <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'real' ? 'bg-white/10' : 'md:hover:bg-white/5'}`} onClick={async () => { await switchAccount('real'); setShowAccountModal(false); }}>
                          <div className="mt-0.5">{accountType === 'real' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-white font-medium mb-0.5 text-sm">Реальный счёт</div>
                              <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.real ? `${modalBalances.real.balance} ${formatCurrencySymbol(modalBalances.real.currency)}` : (snapshot?.type === 'REAL' ? `${getCurrentBalance().balance} ${formatCurrencySymbol(getCurrentBalance().currency)}` : '...'))}</div>
                            </div>
                            <Link href="/profile?tab=wallet" onClick={(e) => e.stopPropagation()} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white text-xs font-semibold md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 transition-all shadow-md shadow-[#3347ff]/20">
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Пополнить</span>
                            </Link>
                          </div>
                        </div>
                        <div className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors ${accountType === 'demo' ? 'bg-white/10' : 'md:hover:bg-white/5'}`} onClick={async () => { await switchAccount('demo'); setShowAccountModal(false); }}>
                          <div className="mt-0.5">{accountType === 'demo' ? <div className="w-4 h-4 rounded-full bg-[#3347ff] flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-[#061230]" /></div> : <div className="w-4 h-4 rounded-full border-2 border-[#3347ff]" />}</div>
                          <div className="flex-1">
                            <div className="text-white font-medium mb-0.5 text-sm">Демо-счёт</div>
                            <div className="text-white/60 text-xs">{hideBalance ? '••••••' : (modalBalances.demo ? `${modalBalances.demo.balance} ${formatCurrencySymbol(modalBalances.demo.currency)}` : (snapshot?.type === 'DEMO' ? `${getCurrentBalance().balance} ${formatCurrencySymbol(getCurrentBalance().currency)}` : '...'))}</div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-white/10 p-3">
                        <div className="flex items-center gap-2.5 cursor-pointer md:hover:opacity-80 transition-opacity" onClick={() => setHideBalance(!hideBalance)}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">{hideBalance ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></> : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}</svg>
                          <span className="text-white text-xs">Скрыть баланс</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Link href="/profile?tab=wallet" className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 px-2.5 sm:px-3 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white md:hover:from-[#3347ff]/90 md:hover:to-[#1e2fcc]/90 transition-all shrink-0" title="Пополнить счёт">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
              <span className="hidden sm:inline text-xs sm:text-sm font-semibold uppercase tracking-wider">Пополнить счёт</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area — на мобилке нижняя навигация в потоке (не fixed), решает баг на iOS */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0 overflow-hidden">
        {/* Left Sidebar — скрыт на мобилке, на десктопе слева */}
        <aside className="hidden md:flex w-[88px] shrink-0 bg-[#05122a] border-r border-white/10 flex-col items-center py-2.5 gap-2">
          <div className="flex-1 flex flex-col items-center gap-2 w-full min-h-0">
            {/* Кнопка истории сделок */}
            <button
              onClick={() => setShowTradesHistory((prev) => !prev)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showTradesHistory
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <History className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">История сделок</span>
            </button>
            
            {/* Кнопка новостей */}
            <button
              onClick={() => setShowNews(true)}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showNews
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <Newspaper className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Новости</span>
            </button>

            {/* Кнопка обучения */}
            <button
              onClick={() => {
                setActiveMenu('обучение');
                window.location.href = '/profile?tab=education';
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'обучение'
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <GraduationCap className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Обучение</span>
            </button>

            {/* Кнопка торгового профиля */}
            <Link
              href="/profile?tab=trade"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'торговый-профиль'
                  ? 'text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Торговый профиль</span>
            </Link>

            {/* Кнопка кошелька */}
            <Link
              href="/profile?tab=wallet"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'кошелек'
                  ? 'text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <Wallet className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Кошелек</span>
            </Link>

            {/* Кнопка личного профиля */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                activeMenu === 'личный-профиль'
                  ? 'text-white'
                  : 'text-gray-400 md:hover:text-white md:hover:bg-white/5'
              }`}
            >
              <UserCircle className="w-5 h-5 stroke-[3]" />
              <span className="text-[10px] font-semibold leading-tight text-center">Личный профиль</span>
            </Link>

          </div>
          <a
            href={process.env.NEXT_PUBLIC_SUPPORT_CHANNEL_URL || FALLBACK_SUPPORT_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 w-[72px] h-12 px-1.5 rounded-lg bg-white/10 transition-colors text-gray-400 md:hover:text-white md:hover:bg-white/15 mt-1 mx-auto"
          >
            <Image src="/images/support.png" alt="Поддержка" width={20} height={20} className="w-5 h-5 object-contain" />
            <span className="text-[9px] font-semibold leading-tight text-center">Поддержка</span>
          </a>
        </aside>

        {/* Trades History Panel */}
        {showTradesHistory && (
          <>
            <div
              className="fixed left-0 md:left-[88px] top-0 right-0 bottom-0 z-40"
              onClick={() => setShowTradesHistory(false)}
              aria-hidden
            />
            <div onClick={(e) => e.stopPropagation()}>
              <TradesHistoryModal onClose={() => setShowTradesHistory(false)} />
            </div>
          </>
        )}

        {/* Page Content — на мобилке первый (выше сайдбара) */}
        <main ref={mainRef} className="flex-1 min-h-0 min-w-0 relative order-1">
          {/* Chart Controls (поверх графика) */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex flex-wrap items-center gap-1 max-w-[calc(100%-0.5rem)]">
            {/* 1. Валютная пара */}
            <div className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <InstrumentMenu
                instrument={instrument}
                onInstrumentChange={handleInstrumentChange}
              />
            </div>

            {/* 2. Тип графика */}
            <div className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <ChartTypeMenu
                chartType={chartType}
                candleMode={candleMode}
                onChartTypeChange={handleChartTypeChange}
                onCandleModeChange={handleCandleModeChange}
              />
            </div>

            {/* 3. Таймфрейм */}
            <div className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <TimeframeMenu
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            </div>

            {/* 4. Индикаторы */}
            <div className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <IndicatorMenu
                indicatorConfigs={indicatorConfigs}
                onConfigChange={setIndicatorConfigs}
              />
            </div>

            {/* 5. Рисование */}
            <div className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <DrawingMenu
                drawingMode={drawingMode}
                onDrawingModeChange={setDrawingMode}
              />
            </div>

          </div>

          {/* Active overlays panel */}
          {overlayVersion >= 0 && (() => {
            const allOverlays = overlayRegistry.getOverlays();
            const nonTradeOverlays = allOverlays.filter((o) => o.type !== 'trade');
            return nonTradeOverlays.length > 0;
          })() && (
            <div className="absolute top-24 left-4 z-10">
              <OverlayPanel
                overlays={overlayRegistry.getOverlays().filter((o) => o.type !== 'trade')}
                onToggleVisibility={overlayRegistry.toggleVisibility}
                onRemove={(id) => {
                  const list = overlayRegistry.getOverlays();
                  const o = list.find((x) => x.id === id);

                  if (o?.type === 'drawing') {
                    if (chartType === 'candles') {
                      candleChartRef.current?.removeDrawing(id);
                    } else {
                      lineChartRef.current?.removeDrawing(id);
                    }
                  }

                  if (o?.type === 'indicator') {
                    setIndicatorConfigs((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, enabled: false } : c)),
                    );
                  }

                  if (o?.type === 'trade') {
                    if (chartType === 'candles') {
                      candleChartRef.current?.removeTrade(id);
                    } else {
                      lineChartRef.current?.removeTrade(id);
                    }
                  }

                  overlayRegistry.removeOverlay(id);
                }}
                onEditIndicator={(id) => {
                  setEditingIndicatorId(id);
                }}
                className="max-h-[260px]"
              />
            </div>
          )}

          {/* Chart wrapper */}
          <div ref={chartContainerRef} className="absolute inset-0 min-w-0 min-h-0 overflow-hidden flex flex-col md:flex-row pt-10 md:pt-0">
            {/* График: canvas занимает всю высоту, кнопки зума внутри, у нижнего края графика */}
            <div className="flex-1 min-w-0 min-h-0 relative">
              <ChartContainer
                key={`${instrument}_${timeframe}_${chartType}_${candleMode}`}
                type={chartType}
                candleMode={candleMode}
                className="w-full h-full"
                style={{ display: 'block' }}
                timeframe={timeframe}
                instrument={instrument}
                payoutPercent={payoutPercent}
                digits={getInstrumentOrDefault(instrument).digits}
                activeInstrumentRef={activeInstrumentRef}
                indicatorConfigs={indicatorConfigs}
                drawingMode={drawingMode}
                overlayRegistry={{
                  getVisibleOverlayIds: overlayRegistry.getVisibleOverlayIds,
                  onDrawingAdded: (o) => {
                    overlayRegistry.addOverlay(o);
                  },
                  onTradeAdded: (o) => {
                    overlayRegistry.addOverlay(o);
                  },
                  onDrawingEdited: onOverlayMutate,
                }}
                onCandleChartRef={(ref) => {
                  candleChartRef.current = ref;
                  if (ref) ref.setExpirationSeconds(Number.parseInt(time || '60', 10));
                }}
                onLineChartRef={(ref) => {
                  lineChartRef.current = ref;
                  if (ref) ref.setExpirationSeconds(Number.parseInt(time || '60', 10));
                }}
                onInstrumentChange={handleInstrumentChange}
              />

              {/* Zoom — кнопки зума закреплены у нижнего края графика, над индикаторами */}
              <div
                className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 z-10 pointer-events-auto"
                style={{ bottom: zoomBottomOffsetPx }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (chartType === 'candles') candleChartRef.current?.zoomOut();
                    else lineChartRef.current?.zoomOut();
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e2a40] text-white hover:bg-[#263248] transition-colors duration-250 ease-in-out"
                  aria-label="Zoom out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (chartType === 'candles') candleChartRef.current?.zoomIn();
                    else lineChartRef.current?.zoomIn();
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e2a40] text-white hover:bg-[#263248] transition-colors duration-250 ease-in-out"
                  aria-label="Zoom in"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Return to latest — только стрелка, фон как у кнопок графика, ближе к правому краю */}
              {showReturnToLatest && (
                <button
                  type="button"
                  onClick={() => {
                    if (chartType === 'candles') {
                      candleChartRef.current?.followLatest();
                      setFollowMode(true);
                    } else {
                      lineChartRef.current?.followLatest();
                    }
                    setShowReturnToLatest(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 pointer-events-auto w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e2a40] text-white hover:bg-[#263248] transition-colors duration-250 ease-in-out animate-in fade-in slide-in-from-right-2 duration-200"
                  aria-label="Return to latest"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* SentimentBar — на мобилке горизонтально под графиком, на десктопе вертикально справа */}
            <div className="shrink-0 flex flex-row md:flex-col items-center md:items-stretch gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-2 py-1.5 sm:py-2 md:py-3 bg-[#05122a]/80 md:w-12">
              {/* На мобилке: горизонтальная компоновка */}
              <div className="md:hidden flex items-center gap-1.5 sm:gap-2 w-full">
                <span className="text-[9px] sm:text-[10px] font-medium text-white/50 shrink-0 tabular-nums min-w-[2rem] text-right" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {buyPercentage}%
                </span>
                <div className="flex-1 min-w-0 h-1.5">
                  <SentimentBar
                    orientation="horizontal"
                    onPercentagesChange={(buy, sell) => {
                      setBuyPercentage(buy);
                      setSellPercentage(sell);
                    }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] font-medium text-white/50 shrink-0 tabular-nums min-w-[2rem] text-left" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {sellPercentage}%
                </span>
              </div>
              
              {/* На десктопе: вертикальная компоновка */}
              <div className="hidden md:flex flex-col items-center justify-center gap-2 h-full py-3">
                <span className="text-[10px] font-medium text-white/50 shrink-0 tabular-nums min-w-[2rem] text-center" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {buyPercentage}%
                </span>
                <div className="flex-1 min-w-0 w-full flex items-center justify-center min-h-0" style={{ height: '100%' }}>
                  <SentimentBar
                    orientation="vertical"
                    height={400}
                    width={12}
                    onPercentagesChange={(buy, sell) => {
                      setBuyPercentage(buy);
                      setSellPercentage(sell);
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium text-white/50 shrink-0 tabular-nums min-w-[2rem] text-center" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {sellPercentage}%
                </span>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar — на мобилке внизу под графиком с градиентом, на десктопе справа; pb-safe для iPhone */}
        <aside className="w-full md:w-48 shrink-0 min-h-0 bg-gradient-to-b from-[#081428] to-[#050f20] md:bg-[#06122c] border-t md:border-t-0 md:border-l border-white/10 p-2 sm:p-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:pb-3 flex flex-col gap-2 sm:gap-3 order-2">
          {/* Time + Amount — на мобилке в ряд */}
          <div className="flex flex-row md:flex-col gap-2 sm:gap-3">
          {/* Time Input */}
          <div className="flex flex-col gap-1 relative flex-1 md:flex-none min-w-0" ref={timeFieldRef}>
            <label className="text-xs text-gray-400">Время</label>
            <div className="flex items-center gap-0 bg-white/10 rounded-lg overflow-hidden px-1">
              {/* Minus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseInt(time || '60', 10);
                  const newValue = Math.max(5, current - 5);
                  setTime(String(newValue));
                  candleChartRef.current?.setExpirationSeconds(newValue);
                  lineChartRef.current?.setExpirationSeconds(newValue);
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Time Display - кликабельное поле */}
              <div 
                className="flex-1 px-2 py-2 text-white text-center text-sm font-medium cursor-pointer md:hover:bg-white/5 transition-colors flex items-center justify-center min-w-0"
                onClick={() => setShowTimeModal(true)}
              >
                <span>{formatTimeDisplay(Number.parseInt(time || '60', 10))}</span>
              </div>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseInt(time || '60', 10);
                  const newValue = Math.min(300, current + 5);
                  setTime(String(newValue));
                  candleChartRef.current?.setExpirationSeconds(newValue);
                  lineChartRef.current?.setExpirationSeconds(newValue);
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Time Selection Modal */}
            {showTimeModal && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTimeModal(false)}
                />
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-[#1a2438] rounded-lg shadow-xl p-3 border border-white/5 md:bottom-auto md:left-auto md:translate-x-0 md:mb-0 md:right-full md:mr-2 md:top-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TimeSelectionModal
                  currentSeconds={Number.parseInt(time || '60', 10)}
                  onSelect={(seconds) => {
                    setTime(String(seconds));
                    candleChartRef.current?.setExpirationSeconds(seconds);
                    lineChartRef.current?.setExpirationSeconds(seconds);
                  }}
                  onClose={() => setShowTimeModal(false)}
                />
                </div>
              </>
            )}
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-1 relative flex-1 md:flex-none min-w-0" ref={amountFieldRef}>
            <label className="text-xs text-gray-400">Сумма</label>
            <div className="flex items-center gap-0 bg-white/10 rounded-lg overflow-hidden px-1">
              {/* Minus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseFloat(amount || '100');
                  const newValue = Math.max(1, current - 10);
                  setAmount(String(newValue));
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
                aria-label="Уменьшить сумму на 10"
              >
                <Minus className="w-3.5 h-3.5" aria-hidden />
              </button>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Amount Display - кликабельное поле */}
              <div
                role="button"
                tabIndex={0}
                className="flex-1 px-2 py-2 text-white text-center text-sm font-medium cursor-pointer md:hover:bg-white/5 transition-colors flex items-center justify-center min-w-0"
                onClick={() => setShowAmountModal(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAmountModal(true); } }}
                aria-label={`Сумма сделки: ${Number.parseFloat(amount || '100').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Нажмите для изменения`}
              >
                <span>{Number.parseFloat(amount || '100').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="w-px h-4 bg-white/25 rounded-full self-center shrink-0" />
              {/* Plus Button */}
              <button
                type="button"
                onClick={() => {
                  const current = Number.parseFloat(amount || '100');
                  const newValue = Math.min(50000, current + 10);
                  setAmount(String(newValue));
                }}
                className="w-9 h-10 shrink-0 flex items-center justify-center text-white"
                aria-label="Увеличить сумму на 10"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>

            {/* Amount Calculator Modal */}
            {showAmountModal && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAmountModal(false)}
                />
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-[#1a2438] rounded-lg shadow-xl overflow-hidden p-3 border border-white/5 md:bottom-auto md:left-auto md:translate-x-0 md:mb-0 md:right-full md:mr-2 md:top-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AmountCalculatorModal
                    currentAmount={Number.parseFloat(amount || '100')}
                    onSelect={(newAmount) => {
                      setAmount(String(newAmount));
                      setShowAmountModal(false);
                    }}
                    onClose={() => setShowAmountModal(false)}
                    payoutPercent={payoutPercent}
                  />
              </div>
            </>
            )}
          </div>
          </div>

          {/* Payout display — desktop */}
          <div className="hidden md:flex flex-row md:flex-col gap-2 md:gap-1.5 items-center justify-center py-2 md:py-3">
            <div className="text-xl md:text-2xl font-bold text-green-400">
              +{payoutPercent}%
            </div>
            <div className="text-sm md:text-base text-gray-400">
              +{((Number.parseFloat(amount || '100') * payoutPercent) / 100).toFixed(2)} {displayCurrency}
            </div>
          </div>

          {/* Trade buttons */}
          <div className="flex flex-row md:flex-col gap-1.5 sm:gap-2 md:gap-2.5 items-stretch md:items-stretch shrink-0">
            <button
              className="flex-1 md:flex-none w-full py-2.5 sm:py-3 md:py-3.5 px-3 md:px-4 text-white font-semibold text-sm md:text-base rounded-lg transition-all flex items-center justify-center tracking-wide shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #4fc63f 0%, #45b833 50%, #3aa028 100%)' }}
              disabled={isTrading}
              onMouseEnter={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  candleChartRef.current?.setHoverAction('CALL');
                  lineChartRef.current?.setHoverAction('CALL');
                }
              }}
              onMouseLeave={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  candleChartRef.current?.setHoverAction(null);
                  lineChartRef.current?.setHoverAction(null);
                }
              }}
              onClick={() => openTrade('CALL')}
            >
              КУПИТЬ
            </button>

            <div className="flex flex-col items-center justify-center gap-0.5 px-2 md:hidden shrink-0 min-w-[72px]">
              <span className="text-base font-bold text-green-400">+{payoutPercent}%</span>
              <span className="text-xs text-gray-400">+{((Number.parseFloat(amount || '100') * payoutPercent) / 100).toFixed(2)} {displayCurrency}</span>
            </div>

            <button
              className="flex-1 md:flex-none w-full py-2.5 sm:py-3 md:py-3.5 px-3 md:px-4 text-white font-semibold text-sm md:text-base rounded-lg transition-all flex items-center justify-center tracking-wide shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #ff5d3f 0%, #ff3d1f 50%, #e63515 100%)' }}
              disabled={isTrading}
              onMouseEnter={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  candleChartRef.current?.setHoverAction('PUT');
                  lineChartRef.current?.setHoverAction('PUT');
                }
              }}
              onMouseLeave={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  candleChartRef.current?.setHoverAction(null);
                  lineChartRef.current?.setHoverAction(null);
                }
              }}
              onClick={() => openTrade('PUT')}
            >
              ПРОДАТЬ
            </button>
          </div>

          {/* Совет от трейдера + кнопки внизу сайдбара — скрыто на мобилке */}
          <div className="hidden md:flex mt-auto flex-col gap-3">
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Image
                src="/images/44.jpg"
                alt="Трейдер"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="text-xs font-semibold text-white">Совет от трейдера</div>
            </div>
            <p className="text-[11px] font-medium text-gray-400 leading-relaxed">
              Не рискуйте суммой больше той, которую готовы потерять. Фиксируйте прибыль по частям и не держите одну сделку «до упора».
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 md:hover:text-white md:hover:opacity-90 transition-colors relative"
              title={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            >
              <span className="relative inline-block">
                <Image src="/images/sound.png" alt="Звук" width={20} height={20} className="w-4 h-4 object-contain" />
                {!soundEnabled && (
                  <span
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    aria-hidden
                  >
                    <span className="w-[130%] h-0.5 bg-red-400/90 rotate-[-45deg] rounded-full" />
                  </span>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 md:hover:text-white md:hover:opacity-90 transition-colors"
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
            >
              <Image src="/images/fullscreen.png" alt="Fullscreen" width={20} height={20} className="w-4 h-4 object-contain" />
            </button>
            <button
              type="button"
              onClick={() => setShowChartSettingsModal(true)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 md:hover:text-white md:hover:opacity-90 transition-colors"
              title="Настройки графика"
            >
              <Image src="/images/settings.png" alt="Настройки" width={20} height={20} className="w-4 h-4 object-contain" />
            </button>
          </div>
          </div>
        </aside>

        {/* Нижняя навигация — на мобилке в потоке после секции кнопок (не fixed), pb-safe для iOS */}
        <nav className="md:hidden shrink-0 order-3 flex items-center justify-around py-1.5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/10 bg-gradient-to-t from-[#05122a] via-[#06122c] to-[#0a1635]">
        <button
          onClick={() => setShowTradesHistory((prev) => !prev)}
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] transition-colors ${
            showTradesHistory ? 'text-[#7b8fff]' : 'text-white/50 md:hover:text-white/80'
          }`}
        >
          <History className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">История</span>
        </button>
        <div className="w-px h-6 bg-white/15 shrink-0" aria-hidden />
        <button
          onClick={() => setShowNews(true)}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] text-white/50 md:hover:text-white/80 transition-colors"
        >
          <Newspaper className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Новости</span>
        </button>
        <div className="w-px h-6 bg-white/15 shrink-0" aria-hidden />
        <Link
          href="/profile?tab=wallet"
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] transition-colors ${
            activeMenu === 'кошелек' ? 'text-[#7b8fff]' : 'text-white/50 md:hover:text-white/80'
          }`}
        >
          <Wallet className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Кошелёк</span>
        </Link>
        <div className="w-px h-6 bg-white/15 shrink-0" aria-hidden />
        <Link
          href="/profile"
          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] transition-colors ${
            activeMenu === 'личный-профиль' ? 'text-[#7b8fff]' : 'text-white/50 md:hover:text-white/80'
          }`}
        >
          <UserCircle className="w-5 h-5 stroke-[3]" />
          <span className="text-[9px] font-semibold leading-tight">Профиль</span>
        </Link>
        <div className="w-px h-6 bg-white/15 shrink-0" aria-hidden />
        <a
          href={process.env.NEXT_PUBLIC_SUPPORT_CHANNEL_URL || FALLBACK_SUPPORT_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg min-w-[52px] text-white/50 md:hover:text-white/80 transition-colors"
        >
          <Image src="/images/support.png" alt="Поддержка" width={20} height={20} className="w-5 h-5 object-contain" />
          <span className="text-[9px] font-semibold leading-tight">Поддержка</span>
        </a>
        </nav>
      </div>

      {/* Chart Settings Modal */}
      {showChartSettingsModal && (
        <ChartSettingsModal onClose={() => setShowChartSettingsModal(false)} />
      )}

      {/* Indicator Settings Modal */}
      {editingIndicatorId && (() => {
        const cfg = indicatorConfigs.find((c) => c.id === editingIndicatorId);
        if (!cfg) return null;

        const close = () => setEditingIndicatorId(null);

        const clampInt = (v: number, min: number, max: number) =>
          Math.max(min, Math.min(max, Math.round(v)));
        const clampFloat = (v: number, min: number, max: number) =>
          Math.max(min, Math.min(max, v));

        const handleSave = (updates: Partial<IndicatorConfig>) => {
          setIndicatorConfigs((prev) =>
            prev.map((c) => (c.id === cfg.id ? { ...c, ...updates } : c)),
          );
        };

        const commonPeriodInput = (
          label: string,
          key: keyof IndicatorConfig,
          min = 2,
          max = 200,
        ) => (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-300">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              defaultValue={cfg[key] as number}
              className="w-full rounded-md bg-[#0b1630] border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3347ff]"
              onBlur={(e) => {
                const raw = Number(e.target.value || cfg[key]);
                const val = clampInt(raw, min, max);
                e.target.value = String(val);
                handleSave({ [key]: val } as Partial<IndicatorConfig>);
              }}
            />
          </div>
        );

        const renderFields = () => {
          switch (cfg.type) {
            case 'SMA':
            case 'EMA':
            case 'Momentum':
            case 'ATR':
            case 'ADX':
              return commonPeriodInput('Период', 'period', 2, 200);
            case 'RSI':
              return commonPeriodInput('Период RSI', 'period', 2, 200);
            case 'Stochastic':
              return (
                <>
                  {commonPeriodInput('%K период', 'period', 2, 200)}
                  {commonPeriodInput('%D период', 'periodD', 1, 50)}
                </>
              );
            case 'BollingerBands':
              return (
                <>
                  {commonPeriodInput('Период', 'period', 5, 200)}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-300">StdDev множитель</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.5}
                      max={5}
                      defaultValue={cfg.stdDevMult ?? 2}
                      className="w-full rounded-md bg-[#0b1630] border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3347ff]"
                      onBlur={(e) => {
                        const raw = Number(e.target.value || (cfg.stdDevMult ?? 2));
                        const val = clampFloat(raw, 0.5, 5);
                        e.target.value = String(val);
                        handleSave({ stdDevMult: val });
                      }}
                    />
                  </div>
                </>
              );
            case 'KeltnerChannels':
              return (
                <>
                  {commonPeriodInput('Период', 'period', 5, 200)}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-300">ATR множитель</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.5}
                      max={5}
                      defaultValue={cfg.atrMult ?? 2}
                      className="w-full rounded-md bg-[#0b1630] border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#3347ff]"
                      onBlur={(e) => {
                        const raw = Number(e.target.value || (cfg.atrMult ?? 2));
                        const val = clampFloat(raw, 0.5, 5);
                        e.target.value = String(val);
                        handleSave({ atrMult: val });
                      }}
                    />
                  </div>
                </>
              );
            case 'MACD':
              return (
                <>
                  {commonPeriodInput('Быстрая EMA', 'period', 2, 100)}
                  {commonPeriodInput('Медленная EMA', 'slowPeriod', 3, 200)}
                  {commonPeriodInput('Сигнальная EMA', 'signalPeriod', 1, 100)}
                </>
              );
            case 'Ichimoku':
              return (
                <>
                  {commonPeriodInput('Tenkan (conversion)', 'period', 1, 52)}
                  {commonPeriodInput('Kijun (base)', 'basePeriod', 1, 100)}
                  {commonPeriodInput('Senkou Span B', 'spanBPeriod', 1, 200)}
                  {commonPeriodInput('Смещение вперёд', 'displacement', 0, 200)}
                </>
              );
            case 'AwesomeOscillator':
              return (
                <>
                  {commonPeriodInput('Медленный период', 'period', 10, 200)}
                  {commonPeriodInput('Быстрый период', 'fastPeriod', 2, 100)}
                </>
              );
            default:
              return null;
          }
        };

        const title =
          cfg.type === 'Stochastic'
            ? 'Stochastic — настройки'
            : cfg.type === 'BollingerBands'
              ? 'Боллинджер — настройки'
              : `${cfg.type} — настройки`;

        return (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-[140]"
              onClick={close}
            />
            <div className="fixed inset-0 z-[150] flex items-center justify-center px-3">
              <div className="w-full max-w-sm rounded-xl bg-[#0b1630] border border-white/10 shadow-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">{title}</h2>
                  <button
                    type="button"
                    onClick={close}
                    className="text-gray-400 hover:text-white text-xs"
                  >
                    Закрыть
                  </button>
                </div>
                <div className="space-y-3">
                  {renderFields()}
                </div>
                <p className="text-[10px] text-gray-400">
                  Значения ограничены разумными диапазонами, чтобы индикатор оставался стабильным и читаемым.
                </p>
              </div>
            </div>
          </>
        );
      })()}

      {/* News Modal */}
      {showNews && (
        <NewsModal onClose={() => setShowNews(false)} />
      )}
    </div>
  </AuthGuard>
  );
}
