'use client';

import Image from 'next/image';
import { Link } from '@/components/navigation';
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowsClockwise,
  ArrowsInSimple,
  ArrowsOutSimple,
  CaretDoubleRight,
  ChartLineUp,
  ChatCircleText,
  ChatTeardropText,
  Check,
  Clock,
  ClockCounterClockwise,
  Copy,
  Gear,
  ChatCircleDots,
  Minus,
  Newspaper,
  Plus,
  PlusCircle,
  SignOut,
  SpeakerHigh,
  SpeakerSlash,
  User,
  UserCircle,
  Wallet,
} from '@phosphor-icons/react';
import { useTerminalSnapshot } from '@/lib/hooks/useTerminalSnapshot';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/lib/hooks/useAuth';
import { useVerificationStatus } from '@/lib/hooks/useVerification';
import { useDisplayName } from '@/lib/hooks/useDisplayName';
import ReactCountryFlag from 'react-country-flag';
import { NotificationsBell } from '@/components/NotificationsBell';

import { ChartContainer } from '@/components/chart/ChartContainer';
import { useWebSocket, type TradeClosePayload } from '@/lib/hooks/useWebSocket';
import { netPnlFromTradeClose } from '@/lib/tradeClosePnl';
import { SentimentBar } from '@/components/chart/SentimentBar';
import { IndicatorMenu } from '@/components/chart/IndicatorMenu';
import { DrawingMenu } from '@/components/chart/DrawingMenu';
import { ChartSettingsMenu } from '@/components/chart/ChartSettingsMenu';
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
import { getAvatarUrl } from '@/lib/avatarUrl';
import { useAccountSwitch } from '@/lib/hooks/useAccountSwitch';
import {
  formatCurrencySymbol,
  formatGroupedBalanceAmount,
  formatPayoutTotalLabel,
  formatTradeAmountLabel,
  getCurrencyIcon,
} from '@/lib/formatCurrency';
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
import { useTerminalPriceStore } from '@/stores/terminalPrice.store';
import { useSentimentFromLivePrice } from '@/lib/hooks/useSentimentFromLivePrice';
import { toast as showToast, showTradeOpenToast, showTradeCloseToast, dismissToastByKey } from '@/stores/toast.store';
import type { AccountSnapshot } from '@/types/account';
import { FALLBACK_SUPPORT_CHANNEL_URL } from '@/lib/constants';
import { CurrencyCountryModal } from '@/components/CurrencyCountryModal';
import { AccountSwitchModal } from '@/components/AccountSwitchModal';
import { OnboardingTour, ONBOARDING_STORAGE_KEY } from '@/components/terminal/OnboardingTour';
import { NewsModal } from './components/NewsModal';
import { ChartSettingsModal } from './components/ChartSettingsModal';
import { TimeSelectionModal } from './components/TimeSelectionModal';
import { AmountCalculatorModal } from './components/AmountCalculatorModal';
import { TradesHistoryModal } from './components/TradesHistoryModal';
import { MobileHeader } from './components/MobileHeader';
import { MobileTradeBar } from './components/MobileTradeBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileTradeDrawer } from './components/MobileTradeDrawer';
import { MobileChartToolbar } from './components/MobileChartToolbar';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

type Timeframe = '5s' | '10s' | '15s' | '30s' | '1m' | '2m' | '3m' | '5m' | '10m' | '15m' | '30m' | '1h' | '4h' | '1d';

const VALID_TIMEFRAMES: Timeframe[] = ['5s', '10s', '15s', '30s', '1m', '2m', '3m', '5m', '10m', '15m', '30m', '1h', '4h', '1d'];

function formatTimeDisplay(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type TerminalPageProps = {
  defaultAccount?: 'demo' | 'real';
};

export function TerminalPageContent({ defaultAccount = 'real' }: TerminalPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ locale: string }>();
  const localeParam = params?.locale;
  const locale = Array.isArray(localeParam) ? localeParam[0] : localeParam;
  const terminalPath = `/${locale ?? 'ru'}/terminal`;
  const terminalDemoPath = `${terminalPath}/demo`;
  const isDemoRoute = pathname?.endsWith('/terminal/demo') ?? false;
  const isOnProfile = Boolean(pathname && /\/profile$/u.test(pathname));
  const profileTabQ = searchParams.get('tab');
  const isProfileTradeTab = isOnProfile && profileTabQ === 'trade';
  const isProfileWalletTab = isOnProfile && profileTabQ === 'wallet';
  const isProfilePersonalTab = isOnProfile && (!profileTabQ || profileTabQ === 'profile');
  const { logout, user } = useAuth();
  const tTerminal = useTranslations('terminal');
  const tc = useTranslations('common');
  const tNav = useTranslations('terminal.nav');
  const tProf = useTranslations('profile');
  const kycStatus = useVerificationStatus();
  const { switchAccount } = useAccountSwitch();

  // Single read of saved layout - all state initializers use this object
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
  const [instrumentsLoaded, setInstrumentsLoaded] = useState(false);
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
          // Stale instrument ID (e.g. from old localStorage) - reset to default
          const fallback = data.find((inst) => inst.id === DEFAULT_INSTRUMENT_ID) ?? data[0]!;
          setInstrument(fallback.id);
          setPayoutPercent(fallback.payoutPercent);
        }
        // Mark instruments as loaded — only now is the instrument ID guaranteed stable
        setInstrumentsLoaded(true);
      } catch (error) {
        logger.error('Failed to load instruments:', error);
        setInstrumentsLoaded(true); // unblock snapshot even on error, use whatever instrument we have
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
  const { data } = useTerminalSnapshot(instrumentsLoaded ? instrument : null);
  const [accountType, setAccountType] = useState<'demo' | 'real'>(defaultAccount);
  const [time, setTime] = useState<string>(il?.tradeTime ?? '60');
  const [amount, setAmount] = useState<string>(il?.tradeAmount ?? '100');
  const [showTimeModal, setShowTimeModal] = useState<boolean>(false);
  const [showAmountModal, setShowAmountModal] = useState<boolean>(false);
  const [isTrading, setIsTrading] = useState<boolean>(false);
  const isTradingRef = useRef(false);
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
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [userCurrency, setUserCurrency] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);
  const accountTypeShort = accountType === 'demo' ? tTerminal('account_short_demo') : tTerminal('account_short_real');
  const accountTypeBadgeClass = accountType === 'demo'
    ? 'bg-[#2478ff]/20 text-[#6ba4ff] border border-[#2478ff]/40'
    : 'bg-white/[0.08] text-white/70 border border-white/[0.15]';
  const { displayName: displayIdentity, avatarInitial, isGuest } = useDisplayName();
  
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
  const displayCurrencyRef = useRef('USD');

  // ── WS refs for feeding data into LineChart from a single WS connection ──
  const linePriceUpdateRef = useRef<((price: number, timestamp: number) => void) | null>(null);
  const lineServerTimeRef = useRef<((timestamp: number) => void) | null>(null);
  const lineTradeCloseRef = useRef<((data: TradeClosePayload) => void) | null>(null);
  const activeTimeframeRef = useRef<string>(timeframe);
  activeTimeframeRef.current = timeframe;

  const lineWsTradeToastRef = useRef<{ openMsg: string; formatTie: (amt: string) => string }>({
    openMsg: '',
    formatTie: () => '',
  });
  lineWsTradeToastRef.current = {
    openMsg: tTerminal('toast_trade_opened'),
    formatTie: (amt: string) =>
      tTerminal('toast_trade_tie', {
        amount: formatTradeAmountLabel(amt, displayCurrencyRef.current),
      }),
  };

  useWebSocket({
    activeInstrumentRef,
    activeTimeframeRef,
    onPriceUpdate: (price, timestamp) => {
      linePriceUpdateRef.current?.(price, timestamp);
      const sym = activeInstrumentRef.current;
      if (sym) useTerminalPriceStore.getState().setInstrumentPrice(sym, price);
    },
    onServerTime: (timestamp) => {
      lineServerTimeRef.current?.(timestamp);
    },
    onTradeOpen: (data) =>
      showTradeOpenToast(
        { ...data, currency: displayCurrencyRef.current },
        lineWsTradeToastRef.current.openMsg,
      ),
    onTradeClose: (data) => {
      lineTradeCloseRef.current?.(data);
      dismissToastByKey(data.id);
      showTradeCloseToast(
        data,
        lineWsTradeToastRef.current.formatTie,
        displayCurrencyRef.current,
      );
    },
    enabled: chartType === 'line' && !!instrument,
  });

  // Page-level store of active trades so they survive chart type switches.
  // Each entry is the raw DTO that can be passed to addTradeOverlayFromDTO.
  const activeTradesRef = useRef<Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: string;
    openedAt: string;
    expiresAt: string;
    amount?: string | number;
  }>>([]);
  const [showReturnToLatest, setShowReturnToLatest] = useState<boolean>(false);
  useEffect(() => {
    const terminalSnapshot = data;
    if (!terminalSnapshot?.openTrades?.length || terminalSnapshot.instrument !== instrument) return;
    const now = Date.now();
    const openTrades = terminalSnapshot.openTrades;
    for (const t of openTrades) {
      const expiresAtMs = new Date(t.expiresAt).getTime();
      if (expiresAtMs <= now) continue;
      const dto = {
        id: t.id,
        direction: t.direction,
        entryPrice: t.entryPrice,
        openedAt: t.openedAt ?? new Date(t.expiresAt - 60 * 1000).toISOString(),
        expiresAt: new Date(t.expiresAt).toISOString(),
        amount: t.amount,
      };
      activeTradesRef.current = [
        ...activeTradesRef.current.filter((x) => x.id !== dto.id),
        dto,
      ];
      candleChartRef.current?.addTradeOverlayFromDTO(dto);
      lineChartRef.current?.addTradeOverlayFromDTO(dto);
    }
  }, [data, instrument]);

  const [showTradesHistory, setShowTradesHistory] = useState<boolean>(false);
  const [tradeOpenedTrigger, setTradeOpenedTrigger] = useState<number>(0);
  const [showNews, setShowNews] = useState<boolean>(false);
  const [tipIndex] = useState<number>(() => Math.floor(Math.random() * 7));
  const [tipDismissed, setTipDismissed] = useState<boolean>(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Mobile state
  const isMobile = useIsMobile(768);
  const [mobileTab, setMobileTab] = useState<'chart' | 'history' | 'news' | 'trade' | 'wallet' | 'profile'>('chart');
  const [mobileDrawer, setMobileDrawer] = useState<'time' | 'amount' | null>(null);
  const [tradeBarHeight, setTradeBarHeight] = useState(0);
  const mobileBottomNavWrapRef = useRef<HTMLDivElement>(null);
  const [mobileBottomNavHeight, setMobileBottomNavHeight] = useState(0);
  const mobileTradeBarRef = useRef<HTMLDivElement>(null);
  const [mobileDrawerBottomPx, setMobileDrawerBottomPx] = useState<number | null>(null);

  /** Позиция drawer времени/суммы от низа layout viewport по верху панели сделок (iPhone / Safari). */
  const measureMobileDrawerBottom = useCallback(() => {
    const el = mobileTradeBarRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    const h = window.innerHeight;
    setMobileDrawerBottomPx(Math.max(56, Math.round(h - top + 8)));
  }, []);

  useLayoutEffect(() => {
    if (!mobileDrawer) {
      setMobileDrawerBottomPx(null);
      return;
    }
    measureMobileDrawerBottom();
    const raf = requestAnimationFrame(measureMobileDrawerBottom);
    const vv = window.visualViewport;
    const onMove = () => measureMobileDrawerBottom();
    window.addEventListener('resize', onMove);
    vv?.addEventListener('resize', onMove);
    vv?.addEventListener('scroll', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      vv?.removeEventListener('resize', onMove);
      vv?.removeEventListener('scroll', onMove);
    };
  }, [mobileDrawer, measureMobileDrawerBottom]);

  useEffect(() => {
    if (!isMobile) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      oH: html.style.overflow,
      oB: body.style.overflow,
      mH: html.style.maxHeight,
      mB: body.style.maxHeight,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.maxHeight = '100dvh';
    body.style.maxHeight = '100dvh';
    return () => {
      html.style.overflow = prev.oH;
      body.style.overflow = prev.oB;
      html.style.maxHeight = prev.mH;
      body.style.maxHeight = prev.mB;
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const el = mobileBottomNavWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMobileBottomNavHeight(el.offsetHeight);
    });
    ro.observe(el);
    setMobileBottomNavHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [isMobile]);

  // Expose trade bar height as CSS variable so ToastContainer can position above it
  useEffect(() => {
    if (isMobile) {
      document.documentElement.style.setProperty('--mobile-trade-bar-h', `${tradeBarHeight}px`);
    }
  }, [tradeBarHeight, isMobile]);

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
    router.push(`/${locale ?? 'ru'}`);
  };

  useEffect(() => {
    const initSnapshot = async () => {
      try {
        const snap = await api<AccountSnapshot>('/api/accounts/snapshot');
        useAccountStore.getState().setSnapshot(snap);
      } catch (error) {
        logger.error('Failed to load account snapshot:', error);
      }
    };
    initSnapshot();
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      const response = await api<{ user: { avatarUrl?: string | null; currency?: string | null; country?: string | null; email?: string | null; id?: string | null; displayId?: number | null; createdAt?: string | null } }>('/api/user/profile');
      setAvatarUrl(response.user.avatarUrl || null);
      setUserCurrency(response.user.currency ?? null);
      setUserCountry(response.user.country ?? null);
      setUserEmail(response.user.email ?? null);
      setUserId(response.user.displayId != null ? String(response.user.displayId) : (response.user.id ?? null));
      setUserCreatedAt(response.user.createdAt ?? null);
      if (!response.user.currency) {
        // Сброс, иначе тур не стартует: в localStorage часто остаётся ключ после тестов / старого сценария
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ONBOARDING_STORAGE_KEY);
        }
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

  useEffect(() => {
    const targetAccount: 'demo' | 'real' = isDemoRoute ? 'demo' : 'real';
    const applyRouteAccount = async () => {
      await switchAccount(targetAccount);
    };
    void applyRouteAccount();
  }, [isDemoRoute, switchAccount]);

  const handleAccountSwitch = useCallback(async (target: 'demo' | 'real') => {
    const switched = await switchAccount(target);
    if (!switched) return;
    const targetPath = target === 'demo' ? terminalDemoPath : terminalPath;
    if (pathname !== targetPath) {
      router.push(targetPath);
    }
  }, [pathname, router, switchAccount, terminalDemoPath, terminalPath]);

  const [resetDemoLoading, setResetDemoLoading] = useState<boolean>(false);
  const [buyPercentage, setBuyPercentage] = useState<number>(50);
  const [sellPercentage, setSellPercentage] = useState<number>(50);
  const sentimentBuyRatio = useSentimentFromLivePrice(instrument);
  const mainRef = useRef<HTMLElement | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  const onCandleChartRef = useCallback((ref: import('@/components/chart/candle/CandleChart').CandleChartRef | null) => {
    candleChartRef.current = ref;
    if (ref) {
      ref.setExpirationSeconds(Number.parseInt(time || '60', 10));
      const now = Date.now();
      for (const trade of activeTradesRef.current) {
        if (new Date(trade.expiresAt).getTime() > now) {
          ref.addTradeOverlayFromDTO(trade);
        }
      }
    }
  }, [time]);

  const onLineChartRef = useCallback((ref: import('@/components/chart/line/LineChart').LineChartRef | null) => {
    lineChartRef.current = ref;
    if (ref) {
      ref.setExpirationSeconds(Number.parseInt(time || '60', 10));
      const now = Date.now();
      for (const trade of activeTradesRef.current) {
        if (new Date(trade.expiresAt).getTime() > now) {
          ref.addTradeOverlayFromDTO(trade);
        }
      }
    }
  }, [time]);

  const [balanceAnimation, setBalanceAnimation] = useState<'increase' | 'decrease' | null>(null);
  const [displayedBalance, setDisplayedBalance] = useState<string>(() => formatGroupedBalanceAmount(0));
  const previousBalanceRef = useRef<number | null>(null);

  // Animate balance changes
  useEffect(() => {
    if (!snapshot) {
      setDisplayedBalance(formatGroupedBalanceAmount(0));
      previousBalanceRef.current = null;
      return;
    }
    const currentBalance = Number(snapshot.balance);
    const previousBalance = previousBalanceRef.current;

    if (previousBalance !== null && previousBalance !== currentBalance) {
      if (currentBalance > previousBalance) setBalanceAnimation('increase');
      else if (currentBalance < previousBalance) setBalanceAnimation('decrease');

      const startBalance = previousBalance;
      const endBalance = currentBalance;
      const duration = 500;
      const startTime = Date.now();

      let rafId: number;
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = startBalance + (endBalance - startBalance) * easeOutCubic;
        setDisplayedBalance(formatGroupedBalanceAmount(current));
        if (progress < 1) rafId = requestAnimationFrame(animate);
        else setDisplayedBalance(formatGroupedBalanceAmount(endBalance));
      };
      rafId = requestAnimationFrame(animate);
      const timeoutId = setTimeout(() => setBalanceAnimation(null), 1000);
      previousBalanceRef.current = currentBalance;
      return () => {
        cancelAnimationFrame(rafId);
        clearTimeout(timeoutId);
      };
    } else {
      setDisplayedBalance(formatGroupedBalanceAmount(currentBalance));
    }
    previousBalanceRef.current = currentBalance;
  }, [snapshot?.balance, snapshot?.accountId]);

  const handleResetDemoAccount = async () => {
    if (!snapshot || snapshot.type !== 'DEMO') return;
    if (Number(snapshot.balance) >= 1000) return;
    try {
      setResetDemoLoading(true);
      await api('/api/accounts/demo/reset', { method: 'POST' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = err.response?.data?.message || err.message || '';
      if (msg.includes('high enough') || msg.includes('not allowed')) {
        showToast(tTerminal('toast_demo_reset_balance'), 'warning');
      } else if (msg.includes('not found')) {
        showToast(tTerminal('toast_demo_not_found'), 'error');
      } else {
        showToast(tTerminal('toast_demo_reset_failed', { message: msg }), 'error');
      }
    } finally {
      setResetDemoLoading(false);
    }
  };

  const displayCurrency = snapshot?.currency ?? userCurrency ?? 'USD';
  displayCurrencyRef.current = displayCurrency;

  const countryCode = (() => {
    const c = userCountry;
    if (!c || c === 'OTHER') return null;
    const t = c.trim();
    return t.length === 2 ? t.toUpperCase() : null;
  })();

  const truncateEmail = (email: string): string => {
    const at = email.indexOf('@');
    if (at < 0) return email;
    const local = email.slice(0, at);
    const domain = email.slice(at);
    if (local.length <= 10) return email;
    return `${local.slice(0, 8)}…${domain}`;
  };

  const joinedDate = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : null;

  const getCurrentBalance = () => {
    if (!snapshot) return { balance: formatGroupedBalanceAmount(0), currency: userCurrency ?? 'USD' };
    return { balance: formatGroupedBalanceAmount(Number(snapshot.balance)), currency: snapshot.currency };
  };

  const [modalBalances, setModalBalances] = useState<{
    demo: { balance: string; currency: string } | null;
    real: { balance: string; currency: string } | null;
  }>({ demo: null, real: null });

  const loadAllBalances = async () => {
    try {
      const accountsResponse = await api<{ accounts: Array<{ type: string; balance: string; currency: string; isActive: boolean }> }>('/api/accounts');
      const demoAccount = accountsResponse.accounts.find((a) => a.type.toLowerCase() === 'demo' && a.isActive) || accountsResponse.accounts.find((a) => a.type.toLowerCase() === 'demo');
      if (demoAccount) {
        setModalBalances((prev) => ({
          ...prev,
          demo: { balance: formatGroupedBalanceAmount(parseFloat(demoAccount.balance)), currency: demoAccount.currency },
        }));
      }
      try {
        const realResponse = await api<{ currency: string; balance: number }>('/api/wallet/balance');
        setModalBalances((prev) => ({
          ...prev,
          real: { balance: formatGroupedBalanceAmount(parseFloat(String(realResponse.balance))), currency: realResponse.currency },
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
              ? tTerminal('ind_bollinger_display', { period: c.period, mult: c.stdDevMult ?? 2 })
              : `${c.type}(${c.period})`;
        const baseParams =
          c.type === 'Stochastic'
            ? { period: c.period, periodD: c.periodD ?? 3 }
            : c.type === 'BollingerBands'
              ? { period: c.period, stdDevMult: c.stdDevMult ?? 2 }
              : { period: c.period };
        const params = { ...baseParams, color: c.color };
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
  }, [indicatorConfigs, overlayRegistry, tTerminal]);

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
      const activeAccount = accountsResponse.accounts.find((a) => a.isActive && a.type.toLowerCase() === accountType);
      if (activeAccount?.id) return activeAccount.id;

      const accountByType = accountsResponse.accounts.find((a) => a.type.toLowerCase() === accountType);
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
    if (isTradingRef.current || isTrading) return;
    isTradingRef.current = true;
    setIsTrading(true);
    try {
      const accountId = await getActiveAccountId();
      if (!accountId) {
        showToast(tTerminal('toast_no_account'), 'error');
        return;
      }
      const amountNum = parseFloat(amount.replace(',', '.'));
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        showToast(tTerminal('toast_invalid_amount'), 'error');
        return;
      }
      let expiration = parseInt(time, 10);
      if (!Number.isFinite(expiration)) expiration = 60;
      expiration = Math.min(3600, Math.max(5, expiration));
      expiration = Math.round(expiration / 5) * 5;

      const idempotencyKey = crypto.randomUUID();

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
          idempotencyKey,
        }),
      });

      candleChartRef.current?.addTradeOverlayFromDTO(res.trade);
      lineChartRef.current?.addTradeOverlayFromDTO(res.trade);
      activeTradesRef.current = [
        ...activeTradesRef.current.filter((x) => x.id !== res.trade.id),
        res.trade,
      ];
      setTradeOpenedTrigger((v) => v + 1);
    } catch (e: unknown) {
      const err = e as Error & { response?: { data?: { error?: string; message?: string } } };
      const api = err.response?.data;
      const code = api?.error;
      const apiMsg = api?.message;
      const insufficient =
        code === 'INSUFFICIENT_BALANCE'
        || err.message === 'INSUFFICIENT_BALANCE'
        || apiMsg === 'Insufficient balance'
        || err.message === 'Insufficient balance';
      showToast(
        insufficient
          ? tTerminal('errors.insufficient_balance')
          : (err.message || tTerminal('errors.open_trade_failed')),
        'error',
      );
    } finally {
      isTradingRef.current = false;
      setIsTrading(false);
    }
  };

  // Dynamic bottom offset for zoom buttons so they sit below the main price area
  // and above bottom indicators (RSI, MACD, etc.), moving together with the chart.
  const zoomBottomOffsetPx = useMemo(() => {
    if (chartType !== 'candles') {
      return 30;
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
      {/* Country & currency first; then onboarding tour for new users (see onComplete) */}
      {showCurrencyModal && (
        <CurrencyCountryModal
          onComplete={() => {
            setShowCurrencyModal(false);
            void loadUserProfile();
            // После закрытия модалки даём кадр на размонтирование оверлея, иначе тур иногда не цепляет DOM
            if (typeof window !== 'undefined') {
              window.setTimeout(() => setShowOnboardingTour(true), 150);
            } else {
              setShowOnboardingTour(true);
            }
          }}
        />
      )}
      {showOnboardingTour && (
        <OnboardingTour
          onComplete={() => {
            setShowOnboardingTour(false);
          }}
        />
      )}
      <div ref={fullscreenContainerRef} className="terminal-page h-dvh max-h-dvh min-h-0 bg-[#061230] flex flex-col overflow-hidden overscroll-none">

      {/* ── MOBILE LAYOUT ─────────────────────────────────── */}
      {isMobile ? (
        <>
          {/* Mobile Header */}
          <MobileHeader
            avatarUrl={avatarUrl}
            avatarInitial={avatarInitial}
            isGuest={isGuest}
            accountType={accountType}
            displayedBalance={displayedBalance}
            hideBalance={hideBalance}
            balanceAnimation={balanceAnimation}
            snapshotCurrency={snapshot?.currency}
            onProfileClick={() => setShowProfileModal((v) => !v)}
            onBalanceClick={async () => { await loadAllBalances(); setShowAccountModal(true); }}
          />

          {/* Mobile Profile Modal (same as desktop) */}
          {showProfileModal && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileModal(false)} />
              <div className="fixed top-[52px] right-2 w-[320px] bg-[#0d1e3a] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden max-h-[calc(100vh-60px)] overflow-y-auto">
                {/* ── Header ── */}
                <div className="relative px-5 pt-5 pb-4 bg-[#0d1e3a] border-b border-white/[0.08]">
                  <div className="relative flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-[#0d1e3a] overflow-hidden shadow-lg">
                        {avatarUrl ? (
                          <img src={getAvatarUrl(avatarUrl) ?? undefined} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#3347ff] to-[#1e2fcc] flex items-center justify-center text-lg font-bold text-white">
                            {isGuest ? (
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white/80">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                              </svg>
                            ) : avatarInitial}
                          </div>
                        )}
                      </div>
                      <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1e3a] ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-white font-semibold text-sm truncate">{displayIdentity}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[11px] text-white/45 font-medium">{accountType === 'demo' ? tc('demo_account') : tc('real_account')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="relative mt-4 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-0.5">{tc('balance')}</div>
                      <div className={`text-lg font-bold transition-colors duration-500 ${balanceAnimation === 'increase' ? 'text-green-400' : balanceAnimation === 'decrease' ? 'text-red-400' : 'text-white'}`}>
                        {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
                      </div>
                    </div>
                    <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="shrink-0 h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-[#3347ff] hover:bg-[#2a3de0] text-white text-xs font-semibold transition-colors">
                      <PlusCircle className="w-3.5 h-3.5" />
                      {tc('topup')}
                    </Link>
                  </div>
                </div>
                <div className="px-3 py-2 space-y-1 border-t border-white/[0.08]">
                  <Link href="/profile" onClick={() => setShowProfileModal(false)} className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                    <User className="w-4 h-4 text-white/50 group-hover:text-[#7b8fff]" weight="fill" />
                    <span className="text-[13px] text-white/70 group-hover:text-white flex-1">{tc('profile')}</span>
                  </Link>
                  <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                    <Wallet className="w-4 h-4 text-white/50 group-hover:text-[#7b8fff]" weight="fill" />
                    <span className="text-[13px] text-white/70 group-hover:text-white flex-1">{tc('wallet')}</span>
                  </Link>
                  <a href={process.env.NEXT_PUBLIC_SUPPORT_CHANNEL_URL || FALLBACK_SUPPORT_CHANNEL_URL} target="_blank" rel="noopener noreferrer" onClick={() => setShowProfileModal(false)} className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors">
                    <ChatTeardropText className="w-4 h-4 text-white/50 group-hover:text-[#7b8fff]" weight="fill" />
                    <span className="text-[13px] text-white/70 group-hover:text-white flex-1">{tc('support')}</span>
                  </a>
                </div>
                <div className="px-3 pb-2 pt-1 border-t border-white/[0.08]">
                  <button onClick={() => { setShowProfileModal(false); handleLogout(); }} className="group w-full h-10 px-3 rounded-xl flex items-center gap-3 text-[#ff6b76] hover:bg-[rgba(255,69,85,0.12)] transition-colors">
                    <SignOut className="w-4 h-4" weight="bold" />
                    <span className="text-[13px] font-medium">{tc('logout')}</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Account Switch Modal */}
          {showAccountModal && (
            <AccountSwitchModal
              mobileLayout
              accountType={accountType}
              hideBalance={hideBalance}
              onHideBalanceToggle={() => setHideBalance(!hideBalance)}
              modalBalances={modalBalances}
              currentBalance={getCurrentBalance()}
              snapshotType={snapshot?.type}
              onSwitchAccount={(type) => handleAccountSwitch(type)}
              onClose={() => setShowAccountModal(false)}
            />
          )}

          {/* Mobile Main Content — chart fills ALL available height */}
          <div className="flex-1 min-h-0 relative flex flex-col">
            {/* Chart takes 100% of this container — trade bar floats OVER it */}
            <main ref={mainRef} className="flex-1 min-h-0 min-w-0 relative overflow-hidden">

              {/* Canvas fills the ENTIRE main area — trade bar floats on top.
                  extraBottomPadding tells the chart renderer to stop drawing
                  that many pixels from the bottom, so candles/labels stay visible */}
              <div
                ref={chartContainerRef}
                data-tour="chart"
                className="absolute inset-0"
              >
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
                  extraBottomPadding={tradeBarHeight + 16}
                  extraTopPadding={56}
                  showMinMaxLabels={false}
                  overlayRegistry={{
                    getVisibleOverlayIds: overlayRegistry.getVisibleOverlayIds,
                    onDrawingAdded: (o) => { overlayRegistry.addOverlay(o); },
                    onTradeAdded: (o) => { overlayRegistry.addOverlay(o); },
                    onDrawingEdited: onOverlayMutate,
                  }}
                  onCandleChartRef={onCandleChartRef}
                  onLineChartRef={onLineChartRef}
                  onInstrumentChange={handleInstrumentChange}
                  linePriceUpdateRef={linePriceUpdateRef}
                  lineServerTimeRef={lineServerTimeRef}
                  lineTradeCloseRef={lineTradeCloseRef}
                  accountCurrency={displayCurrency}
                />
              </div>

              {/* Chart tool controls — compact toolbar for mobile */}
              <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1 max-w-[calc(100%-3.5rem)]">
                <div data-tour="instrument" className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
                  <InstrumentMenu instrument={instrument} onInstrumentChange={handleInstrumentChange} />
                </div>
                <div data-tour="timeframe" className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
                  <ChartSettingsMenu
                    chartType={chartType}
                    candleMode={candleMode}
                    timeframe={timeframe}
                    onChartTypeChange={handleChartTypeChange}
                    onCandleModeChange={handleCandleModeChange}
                    onTimeframeChange={setTimeframe}
                  />
                </div>
                <div className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
                  <IndicatorMenu indicatorConfigs={indicatorConfigs} onConfigChange={setIndicatorConfigs} />
                </div>
                <div className="bg-[#1e2a40]/90 rounded-lg backdrop-blur-sm">
                  <DrawingMenu drawingMode={drawingMode} onDrawingModeChange={setDrawingMode} />
                </div>
              </div>

              {/* Sentiment bar — top-right replaced by horizontal one above trade buttons */}

              {/* Return to latest — sits above the trade bar */}
              {showReturnToLatest && (
                <button
                  type="button"
                  onClick={() => {
                    if (chartType === 'candles') { candleChartRef.current?.followLatest(); setFollowMode(true); }
                    else { lineChartRef.current?.followLatest(); }
                    setShowReturnToLatest(false);
                  }}
                  className="absolute right-6 z-20 w-9 h-9 flex items-center justify-center rounded-lg bg-[#1e2a40]/90 text-white backdrop-blur-sm animate-in fade-in slide-in-from-right-2 duration-200"
                  style={{ bottom: tradeBarHeight + 8 }}
                >
                  <CaretDoubleRight className="w-4 h-4" />
                </button>
              )}

              {/* ── Trade bar FLOATING over the chart (absolute bottom) ── */}
              <MobileTradeBar
                ref={mobileTradeBarRef}
                sentimentBuyRatio={sentimentBuyRatio}
                time={time}
                amount={amount}
                payoutPercent={payoutPercent}
                currency={displayCurrency}
                isTrading={isTrading}
                onTrade={openTrade}
                onTimeClick={() => setMobileDrawer('time')}
                onAmountClick={() => setMobileDrawer('amount')}
                onSettingsClick={() => setShowChartSettingsModal(true)}
                onHeightChange={setTradeBarHeight}
                bottomOffset={28}
              />

              {/* Horizontal sentiment bar is rendered inside MobileTradeBar */}

              {/* Trades History / News panels — full overlay over chart */}
              {(mobileTab === 'history') && (
                <div className="absolute inset-0 z-20 bg-[#061230] flex flex-col [&>div]:!w-full [&>div]:!static">
                  <TradesHistoryModal onClose={() => setMobileTab('chart')} refreshTrigger={tradeOpenedTrigger} accountType={accountType === 'demo' ? 'DEMO' : 'REAL'} />
                </div>
              )}
              {(mobileTab === 'news') && (
                <div className="absolute inset-0 z-20 bg-[#061230] flex flex-col [&>div]:!w-full [&>div]:!static">
                  <NewsModal onClose={() => setMobileTab('chart')} />
                </div>
              )}
            </main>

            {/* Mobile Bottom Nav — always at bottom of screen, below chart */}
            <div ref={mobileBottomNavWrapRef} className="shrink-0">
              <MobileBottomNav
                activeTab={mobileTab}
                onTabChange={(tab) => {
                  if (tab === 'history') { setMobileTab((prev) => prev === 'history' ? 'chart' : 'history'); return; }
                  if (tab === 'news') { setMobileTab((prev) => prev === 'news' ? 'chart' : 'news'); return; }
                  setMobileTab(tab);
                }}
              />
            </div>
          </div>

          {/* Mobile Trade Drawer */}
          <MobileTradeDrawer
            mode={mobileDrawer}
            onClose={() => setMobileDrawer(null)}
            bottomNavHeightPx={mobileBottomNavHeight}
            tradeBarStackPx={Math.max(tradeBarHeight, 168)}
            bottomFromViewportPx={mobileDrawerBottomPx}
            timeSeconds={Number.parseInt(time || '60', 10)}
            onTimeSelect={(s) => {
              setTime(String(s));
              candleChartRef.current?.setExpirationSeconds(s);
              lineChartRef.current?.setExpirationSeconds(s);
            }}
            amount={Number.parseFloat(amount || '100')}
            onAmountSelect={(a) => setAmount(String(a))}
            payoutPercent={payoutPercent}
            currency={displayCurrency}
          />

          {/* Chart Settings Modal */}
          {showChartSettingsModal && (
            <ChartSettingsModal
              onClose={() => setShowChartSettingsModal(false)}
              showTraderTip={!tipDismissed}
              onToggleTraderTip={() => setTipDismissed((v) => !v)}
            />
          )}
        </>
      ) : (
        /* ── DESKTOP LAYOUT ──────────────────────────────── */
        <>
      {/* Header */}
      <header className="bg-[#05122a] border-b border-white/10 shrink-0">
        <div className="px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Comfortrade" width={40} height={40} className="h-10 w-auto object-contain" />
            <span className="inline text-xl font-semibold text-white uppercase truncate max-w-none">Comfortrade</span>
            <NotificationsBell dropdownAlign="left" zIndex={60} />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#3347ff]/50 via-[#5b6bff]/30 to-[#3347ff]/50 blur-sm opacity-60 pointer-events-none" />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#05122a] z-10 pointer-events-none ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-500'}`} title={accountType === 'demo' ? tc('demo_account') : tc('real_account')} />
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowProfileModal(!showProfileModal)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfileModal((v) => !v); } }}
                className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ring-2 ring-white/20 ring-offset-2 ring-offset-[#05122a] shadow-lg"
                aria-label={tTerminal('open_profile_menu')}
                aria-expanded={showProfileModal}
                aria-haspopup="menu"
              >
                {avatarUrl ? (
                  <img src={getAvatarUrl(avatarUrl) ?? undefined} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3347ff] via-[#3d52ff] to-[#1f2a45] flex items-center justify-center text-sm font-bold text-white">
                    {isGuest ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    ) : avatarInitial}
                  </div>
                )}
              </div>

              {showProfileModal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileModal(false)} />
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[340px] bg-[#0d1e3a] border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">

                    {/* ── Header ── */}
                    <div className="relative px-5 pt-5 pb-4 bg-[#0d1e3a] border-b border-white/[0.08]">
                      <div className="relative flex items-center gap-3.5">
                        {/* Аватар */}
                        <div className="relative shrink-0">
                          <div className="w-14 h-14 rounded-full ring-2 ring-white/20 ring-offset-2 ring-offset-[#0d1e3a] overflow-hidden shadow-lg">
                            {avatarUrl ? (
                              <img src={getAvatarUrl(avatarUrl) ?? undefined} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#3347ff] to-[#1e2fcc] flex items-center justify-center text-lg font-bold text-white">
                                {isGuest ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white/80">
                                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                                  </svg>
                                ) : avatarInitial}
                              </div>
                            )}
                          </div>
                          {/* Онлайн-индикатор */}
                          <div className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1e3a] ${accountType === 'demo' ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                        </div>

                        {/* Имя + флаг + тип счёта */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-white font-semibold text-sm truncate">{displayIdentity}</span>
                            {countryCode && (
                              <ReactCountryFlag
                                countryCode={countryCode}
                                svg
                                style={{ width: '1.15em', height: '1.15em', borderRadius: '2px', flexShrink: 0 }}
                              />
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="text-[11px] text-white/45 font-medium">{accountType === 'demo' ? tc('demo_account') : tc('real_account')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Инфо-строки: ID / Email / Дата регистрации */}
                      <div className="relative mt-3.5 space-y-2">
                        {userId && (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src="/images/hashtag.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
                            <span className="text-[12px] text-white/80 tabular-nums">ID {userId}</span>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(userId); setIdCopied(true); setTimeout(() => setIdCopied(false), 1500); }}
                              className="shrink-0 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                              title={idCopied ? tProf('copied') : tProf('copy_id')}
                            >
                              {idCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                        {userEmail && (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src="/images/mail.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
                            <span className="text-[12px] text-white/80 truncate min-w-0" title={userEmail}>{truncateEmail(userEmail)}</span>
                          </div>
                        )}
                        {joinedDate && (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src="/images/calendar.png" alt="" className="w-3.5 h-3.5 shrink-0 object-contain opacity-70" />
                            <span className="text-[12px] text-white/70">{joinedDate}</span>
                          </div>
                        )}
                      </div>

                      {/* Баланс */}
                      <div className="relative mt-4 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium mb-0.5">{tc('balance')}</div>
                          <div className={`text-lg font-bold transition-colors duration-500 ${balanceAnimation === 'increase' ? 'text-green-400' : balanceAnimation === 'decrease' ? 'text-red-400' : 'text-white'}`}>
                            {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
                          </div>
                        </div>
                        <Link
                          href="/profile?tab=wallet"
                          onClick={() => setShowProfileModal(false)}
                          className="shrink-0 h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-[#3347ff] hover:bg-[#2a3de0] text-white text-xs font-semibold transition-colors shadow-md shadow-[#3347ff]/20"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          {tc('topup')}
                        </Link>
                      </div>

                      {/* Быстрые действия */}
                      <div className="relative mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setShowProfileModal(false); setShowAccountModal(true); }}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                        >
                          <ArrowsClockwise className="w-4 h-4 text-[#7b8fff]" />
                          <span className="text-[10px] text-white/50 font-medium">{tc('switch_account')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setHideBalance((v) => !v)}
                          className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
                        >
                          <svg className="w-4 h-4 text-[#7b8fff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {hideBalance
                              ? <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></>
                              : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                            }
                          </svg>
                          <span className="text-[10px] text-white/50 font-medium">{hideBalance ? tc('show_balance') : tc('hide_balance')}</span>
                        </button>
                      </div>
                    </div>


                    {/* ── Навигация ── */}
                    <div className="px-3 py-2 space-y-1 border-t border-white/[0.08]">
                      <Link href="/profile" onClick={() => setShowProfileModal(false)} className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors duration-150">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#3347ff]/20 transition-colors">
                          <User className="w-3.5 h-3.5 text-white/60 group-hover:text-[#7b8fff] transition-colors" weight="fill" />
                        </div>
                        <span className="text-[13px] text-white/70 group-hover:text-white transition-colors flex-1">{tc('profile')}</span>
                        <svg className="w-3.5 h-3.5 text-white/35 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                      <Link href="/profile?tab=wallet" onClick={() => setShowProfileModal(false)} className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors duration-150">
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#3347ff]/20 transition-colors">
                          <Wallet className="w-3.5 h-3.5 text-white/60 group-hover:text-[#7b8fff] transition-colors" weight="fill" />
                        </div>
                        <span className="text-[13px] text-white/70 group-hover:text-white transition-colors flex-1">{tc('wallet')}</span>
                        <svg className="w-3.5 h-3.5 text-white/35 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                      <a
                        href={process.env.NEXT_PUBLIC_SUPPORT_CHANNEL_URL || FALLBACK_SUPPORT_CHANNEL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowProfileModal(false)}
                        className="group h-10 px-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.06] transition-colors duration-150"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 group-hover:bg-[#3347ff]/20 transition-colors">
                          <ChatTeardropText className="w-3.5 h-3.5 text-white/60 group-hover:text-[#7b8fff] transition-colors" weight="fill" />
                        </div>
                        <span className="text-[13px] text-white/70 group-hover:text-white transition-colors flex-1">{tc('support')}</span>
                        <svg className="w-3.5 h-3.5 text-white/35 group-hover:text-white/60 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </a>
                    </div>

                    {/* ── Футер ── */}
                    <div className="px-3 pb-2 pt-1 border-t border-white/[0.08]">
                      <button onClick={() => { setShowProfileModal(false); handleLogout(); }} className="group w-full h-10 px-3 rounded-xl flex items-center gap-3 text-[#ff6b76] hover:bg-[rgba(255,69,85,0.12)] transition-colors duration-150">
                        <div className="w-7 h-7 rounded-lg bg-[rgba(255,69,85,0.14)] flex items-center justify-center shrink-0">
                          <SignOut className="w-3.5 h-3.5" weight="bold" />
                        </div>
                        <span className="text-[13px] font-medium">{tc('logout')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {(snapshot?.type === 'DEMO' && snapshot && Number(snapshot.balance) < 1000) && (
                <button type="button" className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleResetDemoAccount} disabled={resetDemoLoading} title={tTerminal('reset_demo_balance')}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              )}
              <div data-tour="balance" className="flex flex-col relative pr-3" data-account-modal>
                <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity" data-account-modal onClick={async () => { await loadAllBalances(); setShowAccountModal(true); }}>
                  <span className="text-xs text-white font-medium">{accountType === 'demo' ? tc('demo_account') : tc('real_account')}</span>
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <div className={`text-base font-semibold transition-all duration-500 ${hideBalance ? 'text-white' : balanceAnimation === 'increase' ? 'text-green-400 scale-105' : balanceAnimation === 'decrease' ? 'text-red-400 scale-105' : 'text-white'}`} style={{ transition: 'color 0.5s ease, transform 0.3s ease' }}>
                  {hideBalance ? '••••••' : snapshot ? `${displayedBalance} ${formatCurrencySymbol(snapshot.currency)}` : '...'}
                </div>
                {showAccountModal && (
                  <AccountSwitchModal
                    accountType={accountType}
                    hideBalance={hideBalance}
                    onHideBalanceToggle={() => setHideBalance(!hideBalance)}
                    modalBalances={modalBalances}
                    currentBalance={getCurrentBalance()}
                    snapshotType={snapshot?.type}
                    onSwitchAccount={(type) => handleAccountSwitch(type)}
                    onClose={() => setShowAccountModal(false)}
                  />
                )}
              </div>
            </div>

            <Link href="/profile?tab=wallet" className="flex items-center gap-2 h-11 px-3 rounded-lg bg-gradient-to-r from-[#3347ff] to-[#1e2fcc] text-white hover:from-[#3347ff]/90 hover:to-[#1e2fcc]/90 transition-all shrink-0" title={tc('topup_account')}>
              <Wallet className="w-6 h-6 shrink-0" />
              <span className="inline text-sm font-semibold uppercase tracking-wider">{tc('topup_account')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area — desktop layout only */}
      <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-[88px] shrink-0 bg-[#05122a] border-r border-white/10 flex-col items-center py-2.5 gap-2">
          <div className="flex-1 flex flex-col items-center gap-2 w-full min-h-0">
            {/* Кнопка истории сделок */}
            <button
              onClick={() => { setShowTradesHistory((prev) => !prev); setShowNews(false); }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showTradesHistory
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClockCounterClockwise size={25} weight="fill" className="shrink-0" />
              <span className="text-[11px] font-bold leading-tight text-center">{tNav('history')}</span>
            </button>
            
            {/* Кнопка новостей */}
            <button
              onClick={() => { setShowNews((prev) => !prev); setShowTradesHistory(false); }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                showNews
                  ? 'bg-[#3347ff]/20 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Newspaper size={25} weight="fill" className="shrink-0" />
              <span className="text-[11px] font-bold leading-tight text-center">{tNav('news')}</span>
            </button>

            {/* Кнопка торгового профиля */}
            <Link
              href="/profile?tab=trade"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                isProfileTradeTab
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ChartLineUp size={25} weight="fill" className="shrink-0" />
              <span className="text-[11px] font-bold leading-tight text-center">{tNav('trading')}</span>
            </Link>

            {/* Кнопка кошелька */}
            <Link
              href="/profile?tab=wallet"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                isProfileWalletTab
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Wallet size={25} weight="fill" className="shrink-0" />
              <span className="text-[11px] font-bold leading-tight text-center">{tc('wallet')}</span>
            </Link>

            {/* Кнопка личного профиля */}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center gap-1 w-full h-14 px-1.5 rounded-lg transition-colors ${
                isProfilePersonalTab
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCircle size={25} weight="fill" className="shrink-0" />
              <span className="text-[11px] font-bold leading-tight text-center">{tc('profile')}</span>
            </Link>

          </div>

          <a
            href={process.env.NEXT_PUBLIC_SUPPORT_CHANNEL_URL || FALLBACK_SUPPORT_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 w-[72px] h-12 px-1.5 rounded-lg bg-white/10 transition-colors text-gray-400 hover:text-white hover:bg-white/15 mt-1 mx-auto"
          >
            <ChatCircleDots className="w-[22px] h-[22px]" weight="fill" />
            <span className="text-[10px] font-bold leading-tight text-center">{tc('support')}</span>
          </a>
        </aside>

        {/* Trades History Panel - на десктопе inline (сдвигает график), на мобилке fixed оверлей */}
        {showTradesHistory && (
          <div className="shrink-0 animate-in slide-in-from-left-2 duration-200" onClick={(e) => e.stopPropagation()}>
            <TradesHistoryModal onClose={() => setShowTradesHistory(false)} refreshTrigger={tradeOpenedTrigger} accountType={accountType === 'demo' ? 'DEMO' : 'REAL'} />
          </div>
        )}

        {showNews && (
          <div className="shrink-0 animate-in slide-in-from-left-2 duration-200" onClick={(e) => e.stopPropagation()}>
            <NewsModal onClose={() => setShowNews(false)} />
          </div>
        )}

        <main ref={mainRef} className="flex-1 min-h-0 min-w-0 relative">
          {/* Chart Controls (поверх графика) */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1 max-w-[calc(100%-0.5rem)]">
            {/* 1. Валютная пара */}
            <div data-tour="instrument" className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <InstrumentMenu
                instrument={instrument}
                onInstrumentChange={handleInstrumentChange}
              />
            </div>

            {/* 2. Тип графика + таймфрейм */}
            <div data-tour="timeframe" className="bg-[#1e2a40] rounded-lg transition-colors duration-300 ease-in-out hover:bg-[#263248]">
              <ChartSettingsMenu
                chartType={chartType}
                candleMode={candleMode}
                timeframe={timeframe}
                onChartTypeChange={handleChartTypeChange}
                onCandleModeChange={handleCandleModeChange}
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
            <div className="absolute top-24 left-4 z-[1]">
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
          <div ref={chartContainerRef} data-tour="chart" className="absolute inset-0 min-w-0 min-h-0 overflow-hidden flex flex-row pt-0">
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
                onCandleChartRef={onCandleChartRef}
                onLineChartRef={onLineChartRef}
                onInstrumentChange={handleInstrumentChange}
                linePriceUpdateRef={linePriceUpdateRef}
                lineServerTimeRef={lineServerTimeRef}
                lineTradeCloseRef={lineTradeCloseRef}
                accountCurrency={displayCurrency}
              />

              {/* Zoom controls */}
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
                  aria-label={tTerminal('chart_zoom_out')}
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
                  aria-label={tTerminal('chart_zoom_in')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Return to latest - только стрелка, фон как у кнопок графика, ближе к правому краю */}
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
                  aria-label={tTerminal('chart_return_latest')}
                >
                  <CaretDoubleRight className="w-4 h-4" />
                </button>
              )}

            </div>
            
            <div className="shrink-0 flex flex-col items-stretch gap-2 px-2 py-3 bg-[#05122a]/80 w-12">
              <div className="flex flex-col items-center justify-center gap-2 h-full py-3">
                <span className="text-[10px] font-medium text-white/50 shrink-0 tabular-nums min-w-[2rem] text-center" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {buyPercentage}%
                </span>
                <div className="flex-1 min-w-0 w-full flex items-center justify-center min-h-0" style={{ height: '100%' }}>
                  <SentimentBar
                    orientation="vertical"
                    height={400}
                    width={12}
                    externalBuyRatio={sentimentBuyRatio}
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

        {/* Right Sidebar */}
        <aside className="w-48 shrink-0 min-h-0 bg-[#06122c] border-l border-white/10 p-3 pb-3 flex flex-col gap-3">
          <div className="flex flex-col gap-3">
          {/* Time Input */}
          <div data-tour="time-field" className="flex flex-col gap-1 relative flex-none min-w-0" ref={timeFieldRef}>
            <button
              type="button"
              onClick={() => setShowTimeModal(true)}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.05] transition-colors"
            >
              <Clock className="w-3.5 h-3.5 text-white/50 shrink-0" weight="bold" />
              <div className="flex flex-col items-start min-w-0 gap-0.5">
                <span className="text-[8px] text-white/30 uppercase tracking-wide leading-none">{tTerminal('time_short')}</span>
                <span className="text-sm font-semibold text-white leading-none tabular-nums">
                  {formatTimeDisplay(Number.parseInt(time || '60', 10))}
                </span>
              </div>
            </button>
            {/* Time Selection Modal */}
            {showTimeModal && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTimeModal(false)}
                />
                <div
                  className="absolute bottom-auto left-auto max-w-none translate-x-0 mb-0 right-full mr-2 top-0 w-52 z-50 bg-[#0d1e3a] rounded-xl shadow-2xl border border-white/[0.08]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TimeSelectionModal
                    currentSeconds={Number.parseInt(time || '60', 10)}
                    onSelect={(seconds) => {
                      setTime(String(seconds));
                      candleChartRef.current?.setExpirationSeconds(seconds);
                      lineChartRef.current?.setExpirationSeconds(seconds);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Amount Input */}
          <div data-tour="amount-field" className="flex flex-col gap-1 relative flex-none min-w-0" ref={amountFieldRef}>
            <button
              type="button"
              onClick={() => setShowAmountModal(true)}
              className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 bg-white/[0.07] hover:bg-white/[0.10] active:bg-white/[0.05] transition-colors"
            >
              <span className="text-white/50 font-bold shrink-0 leading-none text-base">
                {getCurrencyIcon(displayCurrency)}
              </span>
              <div className="flex flex-col items-start min-w-0 gap-0.5">
                <span className="text-[8px] text-white/30 uppercase tracking-wide leading-none">{tTerminal('amount_short')}</span>
                <span className="text-sm font-semibold text-white leading-none tabular-nums truncate">
                  {formatGroupedBalanceAmount(Number.parseFloat(amount || '100'))}
                </span>
              </div>
            </button>
            {/* Amount Calculator Modal */}
            {showAmountModal && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAmountModal(false)}
                />
                <div
                  className="absolute bottom-auto left-auto max-w-none mb-0 right-full mr-2 top-0 translate-x-0 w-60 z-50 bg-[#0d1e3a] rounded-xl shadow-2xl overflow-hidden border border-white/[0.08]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <AmountCalculatorModal
                    currentAmount={Number.parseFloat(amount || '100')}
                    onSelect={(newAmount) => {
                      setAmount(String(newAmount));
                    }}
                    payoutPercent={payoutPercent}
                    currency={displayCurrency}
                  />
                </div>
              </>
            )}
          </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center justify-center py-3">
            <div className="text-3xl font-medium text-green-400">
              +{payoutPercent}%
            </div>
            <div className="text-base text-gray-400">
              {formatPayoutTotalLabel(
                (Number.parseFloat(amount || '100') * payoutPercent) / 100,
                displayCurrency,
              )}
            </div>
          </div>

          <div data-tour="trade-buttons" className="flex flex-col gap-2.5 items-stretch shrink-0">
            <button
              className="flex-none w-full py-[14px] px-4 text-white font-extrabold text-[15px] rounded-2xl tracking-widest uppercase transition-transform active:scale-[0.97] duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(145deg, #3fcc34 0%, #2db523 55%, #209817 100%)',
                boxShadow: '0 4px 16px rgba(46,181,36,0.35)',
              }}
              disabled={isTrading}
              onMouseEnter={() => {
                candleChartRef.current?.setHoverAction('CALL');
                lineChartRef.current?.setHoverAction('CALL');
              }}
              onMouseLeave={() => {
                candleChartRef.current?.setHoverAction(null);
                lineChartRef.current?.setHoverAction(null);
              }}
              onClick={() => openTrade('CALL')}
            >
              {tTerminal('buy')}
            </button>

            <button
              className="flex-none w-full py-[14px] px-4 text-white font-extrabold text-[15px] rounded-2xl tracking-widest uppercase transition-transform active:scale-[0.97] duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(145deg, #f03a22 0%, #d42814 55%, #b81f0c 100%)',
                boxShadow: '0 4px 16px rgba(212,40,20,0.35)',
              }}
              disabled={isTrading}
              onMouseEnter={() => {
                candleChartRef.current?.setHoverAction('PUT');
                lineChartRef.current?.setHoverAction('PUT');
              }}
              onMouseLeave={() => {
                candleChartRef.current?.setHoverAction(null);
                lineChartRef.current?.setHoverAction(null);
              }}
              onClick={() => openTrade('PUT')}
            >
              {tTerminal('sell')}
            </button>
          </div>

          <div className="flex mt-auto flex-col gap-3">

          {/* Совет от трейдера */}
          {!tipDismissed && (() => {
            const tips = [
              tTerminal('tip_1'),
              tTerminal('tip_2'),
              tTerminal('tip_3'),
              tTerminal('tip_4'),
              tTerminal('tip_5'),
              tTerminal('tip_6'),
              tTerminal('tip_7'),
            ];
            const tip = tips[tipIndex % tips.length];
            return (
              <div className="group/tip">
                <div className="relative rounded-xl overflow-hidden p-[1px]" style={{ background: 'linear-gradient(135deg, rgba(51,71,255,0.45) 0%, rgba(123,143,255,0.15) 50%, rgba(51,71,255,0.08) 100%)' }}>
                  <div className="rounded-xl px-3 pt-2.5 pb-3" style={{ background: 'linear-gradient(160deg, #0d1e3a 0%, #081428 100%)' }}>
                    {/* Крестик при наведении */}
                    <button
                      type="button"
                      onClick={() => setTipDismissed(true)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/0 group-hover/tip:bg-white/10 text-white/0 group-hover/tip:text-white/40 hover:!text-white/80 hover:!bg-white/15 transition-all duration-200 flex items-center justify-center"
                      aria-label={tTerminal('close_tip')}
                    >
                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                        <path d="M1 1l8 8M9 1l-8 8" />
                      </svg>
                    </button>

                    {/* Аватар + имя */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden ring-2 ring-[#3347ff]/40 shadow-md shadow-[#3347ff]/20">
                        <img src="/images/trady.png" alt="Trady AI" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-semibold text-white/90 leading-tight">Trady</span>
                          <span className="inline-flex items-center px-1 py-0 rounded text-[8px] font-bold tracking-wide" style={{ background: 'linear-gradient(90deg, #3347ff, #7b8fff)', color: '#fff' }}>AI</span>
                        </div>
                      </div>
                    </div>

                    {/* Текст совета */}
                    <p className="text-[12px] leading-[1.55] text-white/60 pl-0.5">
                      &ldquo;{tip}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors relative"
              title={soundEnabled ? tTerminal('sound_off') : tTerminal('sound_on')}
            >
              {soundEnabled ? <SpeakerHigh className="w-[18px] h-[18px]" weight="fill" /> : <SpeakerSlash className="w-[18px] h-[18px] text-red-400" weight="fill" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors"
              title={isFullscreen ? tTerminal('fullscreen_exit') : tTerminal('fullscreen_enter')}
            >
              {isFullscreen ? <ArrowsInSimple className="w-[18px] h-[18px]" weight="bold" /> : <ArrowsOutSimple className="w-[18px] h-[18px]" weight="bold" />}
            </button>
            <button
              type="button"
              onClick={() => setShowChartSettingsModal(true)}
              className="flex-1 h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#24304d] to-[#1f2a45] text-gray-300 hover:text-white hover:opacity-90 transition-colors"
              title={tTerminal('chart_settings')}
            >
              <Gear className="w-[18px] h-[18px]" weight="fill" />
            </button>
          </div>

          </div>
        </aside>
      </div>

      {/* Chart Settings Modal */}
      {showChartSettingsModal && (
        <ChartSettingsModal
          onClose={() => setShowChartSettingsModal(false)}
          showTraderTip={!tipDismissed}
          onToggleTraderTip={() => setTipDismissed((v) => !v)}
        />
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

        const StepInput = ({
          label,
          value,
          min,
          max,
          step = 1,
          onChange,
        }: {
          label: string;
          value: number;
          min: number;
          max: number;
          step?: number;
          onChange: (v: number) => void;
        }) => {
          const isInt = step === 1;
          const clamp = (v: number) =>
            isInt ? clampInt(v, min, max) : clampFloat(v, min, max);
          const fmt = (v: number) =>
            isInt ? String(Math.round(v)) : String(v);
          return (
            <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.05] last:border-0">
              <span className="text-[13px] text-white/75 leading-tight">{label}</span>
              <div className="flex items-center gap-0 rounded-lg border border-white/[0.08] bg-white/[0.04] overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(clamp(value - step))}
                  className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
                  </svg>
                </button>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={fmt(value)}
                  onChange={(e) => {
                    const v = isInt ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                    if (!isNaN(v)) onChange(clamp(v));
                  }}
                  onBlur={(e) => {
                    const v = isInt
                      ? parseInt(e.target.value, 10)
                      : parseFloat(e.target.value);
                    onChange(clamp(isNaN(v) ? value : v));
                  }}
                  className="w-10 text-center text-[13px] font-semibold text-white bg-transparent border-x border-white/[0.08] focus:outline-none tabular-nums py-1"
                  style={{ MozAppearance: 'textfield' }}
                />
                <button
                  type="button"
                  onClick={() => onChange(clamp(value + step))}
                  className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          );
        };

        const renderFields = () => {
          switch (cfg.type) {
            case 'SMA':
            case 'EMA':
            case 'Momentum':
            case 'ATR':
            case 'ADX':
              return (
                <StepInput
                  label={tTerminal('ind_period')}
                  value={cfg.period}
                  min={2} max={200}
                  onChange={(v) => handleSave({ period: v })}
                />
              );
            case 'RSI':
              return (
                <StepInput
                  label={tTerminal('ind_period_rsi')}
                  value={cfg.period}
                  min={2} max={200}
                  onChange={(v) => handleSave({ period: v })}
                />
              );
            case 'Stochastic':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_k_period')}
                    value={cfg.period}
                    min={2} max={200}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_d_period')}
                    value={cfg.periodD ?? 3}
                    min={1} max={50}
                    onChange={(v) => handleSave({ periodD: v })}
                  />
                </>
              );
            case 'BollingerBands':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_period')}
                    value={cfg.period}
                    min={5} max={200}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_stddev')}
                    value={cfg.stdDevMult ?? 2}
                    min={0.5} max={5} step={0.1}
                    onChange={(v) => handleSave({ stdDevMult: v })}
                  />
                </>
              );
            case 'KeltnerChannels':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_period')}
                    value={cfg.period}
                    min={5} max={200}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_atr_mult')}
                    value={cfg.atrMult ?? 2}
                    min={0.5} max={5} step={0.1}
                    onChange={(v) => handleSave({ atrMult: v })}
                  />
                </>
              );
            case 'MACD':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_fast_ema')}
                    value={cfg.period}
                    min={2} max={100}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_slow_ema')}
                    value={cfg.slowPeriod ?? 26}
                    min={3} max={200}
                    onChange={(v) => handleSave({ slowPeriod: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_signal_ema')}
                    value={cfg.signalPeriod ?? 9}
                    min={1} max={100}
                    onChange={(v) => handleSave({ signalPeriod: v })}
                  />
                </>
              );
            case 'Ichimoku':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_ichimoku_tenkan')}
                    value={cfg.period}
                    min={1} max={52}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_ichimoku_kijun')}
                    value={cfg.basePeriod ?? 26}
                    min={1} max={100}
                    onChange={(v) => handleSave({ basePeriod: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_ichimoku_senkou')}
                    value={cfg.spanBPeriod ?? 52}
                    min={1} max={200}
                    onChange={(v) => handleSave({ spanBPeriod: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_displacement')}
                    value={cfg.displacement ?? 26}
                    min={0} max={200}
                    onChange={(v) => handleSave({ displacement: v })}
                  />
                </>
              );
            case 'AwesomeOscillator':
              return (
                <>
                  <StepInput
                    label={tTerminal('ind_slow_period')}
                    value={cfg.period}
                    min={10} max={200}
                    onChange={(v) => handleSave({ period: v })}
                  />
                  <StepInput
                    label={tTerminal('ind_fast_period')}
                    value={cfg.fastPeriod ?? 5}
                    min={2} max={100}
                    onChange={(v) => handleSave({ fastPeriod: v })}
                  />
                </>
              );
            default:
              return null;
          }
        };

        const title =
          cfg.type === 'Stochastic'
            ? tTerminal('ind_stochastic_title')
            : cfg.type === 'BollingerBands'
              ? tTerminal('ind_bollinger_title')
              : tTerminal('ind_settings_title', { name: cfg.type });

        const dotColor = cfg.color ?? '#3347ff';

        return (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-[140]"
              onClick={close}
            />
            <div className="fixed inset-0 z-[150] flex items-center justify-center px-4">
              <div
                className="w-full max-w-[340px] bg-[#0b1a30] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/[0.07]">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
                  />
                  <h2 className="flex-1 text-[15px] font-semibold text-white leading-tight">{title}</h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={tTerminal('ind_close')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Fields */}
                <div className="px-5 py-2">
                  {renderFields()}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 pt-2">
                  <button
                    type="button"
                    onClick={close}
                    className="w-full h-9 rounded-xl bg-[#3347ff] hover:bg-[#2a3ae8] text-white text-[13px] font-semibold transition-colors"
                  >
                    {tTerminal('ind_apply')}
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

        </> /* end desktop layout */
      )} {/* end isMobile ternary */}

    </div>
  </AuthGuard>
  );
}