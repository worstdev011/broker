'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/components/navigation';
import { Tag, ArrowSquareOut, ClockCounterClockwise, CaretRight, Shield, SealCheck, Calendar, EnvelopeSimple, CheckCircle } from '@phosphor-icons/react';
import { api } from '@/lib/api/api';
import { useIsVerified } from '@/lib/hooks/useVerification';
import { toast } from '@/stores/toast.store';

type PaymentMethodId =
  | 'CARD'
  | 'PRIVAT24'
  | 'CARD_UAH'
  | 'BINANCE_PAY'
  | 'USDT_TRC20'
  | 'BTC'
  | 'ETH'
  | 'USDC'
  | 'BNB'
  | 'XRP'
  | 'SOL'
  | 'DOGE'
  | 'ADA'
  | 'AVAX'
  | 'MATIC'
  | 'LTC'
  | 'DOT';

type PaymentSpeed = 'instant' | 'delayed';

const PAYMENT_METHODS_BASE: Array<{
  id: PaymentMethodId;
  speed: PaymentSpeed;
  mask?: string;
  image?: string;
  minAmount?: number;
  maxAmount?: number;
}> = [
  { id: 'CARD', image: '/images/visa%20master.webp', speed: 'instant', minAmount: 200, maxAmount: 1000 },
  { id: 'PRIVAT24', image: '/images/privat24.png', speed: 'instant', minAmount: 200, maxAmount: 1000 },
  { id: 'CARD_UAH', image: '/images/creditcard.png', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'BINANCE_PAY', image: '/images/binancepay.png', speed: 'instant', minAmount: 200, maxAmount: 1000 },
  { id: 'USDT_TRC20', image: '/images/tether.png', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'BTC', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'ETH', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'USDC', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'BNB', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'XRP', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'SOL', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'DOGE', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'ADA', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'AVAX', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'MATIC', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'LTC', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
  { id: 'DOT', speed: 'delayed', minAmount: 200, maxAmount: 1000 },
];

const WITHDRAW_METHOD_IDS: PaymentMethodId[] = ['CARD', 'PRIVAT24', 'CARD_UAH', 'BINANCE_PAY', 'USDT_TRC20'];

const MIN_AMOUNT_UAH = 300;
const MAX_AMOUNT_UAH = 29_999;

const QUICK_AMOUNTS = [300, 500, 1000, 5000];

function methodLabelKey(methodId: string): `method_${PaymentMethodId}` | null {
  const ids: PaymentMethodId[] = [
    'CARD', 'PRIVAT24', 'CARD_UAH', 'BINANCE_PAY', 'USDT_TRC20', 'BTC', 'ETH', 'USDC', 'BNB', 'XRP', 'SOL', 'DOGE', 'ADA', 'AVAX', 'MATIC', 'LTC', 'DOT',
  ];
  if (ids.includes(methodId as PaymentMethodId)) return `method_${methodId}` as `method_${PaymentMethodId}`;
  return null;
}

function WalletPageSkeleton() {
  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-0 overflow-x-hidden">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-white/[0.08] px-4 md:px-8 pt-4 md:pt-6 gap-1">
          {[96, 80, 120].map((w) => (
            <div key={w} className="h-8 rounded-t-lg bg-white/5 animate-pulse mb-px" style={{ width: w }} />
          ))}
        </div>

        <div className="flex-1 min-h-0 p-4 md:p-8 overflow-auto">
          <div className="w-full">
            {/* Title */}
            <div className="h-6 w-40 bg-white/10 rounded animate-pulse mb-1.5" />
            <div className="h-3 w-48 md:w-80 bg-white/5 rounded animate-pulse mb-6 md:mb-8" />

            {/* Two columns → single on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
              {/* Payment methods */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4 md:mb-5">
                  <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="space-y-3 md:space-y-4">
                  <div>
                    <div className="h-3 w-36 bg-white/5 rounded animate-pulse mb-2" />
                    <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
                    <div className="h-3 w-28 bg-white/5 rounded animate-pulse mt-1.5" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-20 rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                  <div className="h-10 w-full bg-[#3347ff]/20 rounded-xl animate-pulse" />
                </div>
              </div>
            </div>

            {/* Recent transactions header + table */}
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-8 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              <WalletTableSkeleton rows={3} />
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar — desktop only */}
      <div className="hidden md:flex w-[320px] shrink-0 px-4 py-6 flex-col gap-6 bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f] border-l border-white/10">
        <div className="rounded-xl border border-white/[0.08] bg-[#030E28] p-6 space-y-5">
          <div>
            <div className="h-6 w-20 bg-white/10 rounded animate-pulse mb-1" />
            <div className="h-3 w-36 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              </div>
            ))}
            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
              <div className="h-5 w-20 bg-white/10 rounded animate-pulse" />
              <div className="h-7 w-28 bg-[#3347ff]/20 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-12 w-full rounded-xl bg-[#3347ff]/20 animate-pulse mt-2" />
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3 items-start">
          <div className="w-10 h-10 rounded-lg bg-white/10 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-44 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
        <div className="rounded-xl bg-white/5 animate-pulse h-32" />
      </div>
    </div>
  );
}

function WalletTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-white/[0.04]">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between px-4 py-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-40 bg-white/5 rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-white/10 rounded animate-pulse ml-4" />
        </div>
      ))}
    </div>
  );
}

interface WalletTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  date: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
}

export function WalletTab() {
  const t = useTranslations('wallet');
  const locale = useLocale();
  const isVerified = useIsVerified();
  const pathname = usePathname();
  const router = useRouter();
  const depositReturnHandledRef = useRef(false);

  type ResolvedMethod = (typeof PAYMENT_METHODS_BASE)[number] & { label: string; speedLabel: string };

  const paymentMethods = useMemo<ResolvedMethod[]>(
    () =>
      PAYMENT_METHODS_BASE.map((m) => ({
        ...m,
        label: t(`method_${m.id}`),
        speedLabel: m.speed === 'instant' ? t('speed_instant') : t('speed_delayed'),
      })),
    [t],
  );

  const withdrawPaymentMethods = useMemo(
    () => paymentMethods.filter((m) => WITHDRAW_METHOD_IDS.includes(m.id)),
    [paymentMethods],
  );

  const cardDepositMethodsUah = useMemo(
    () =>
      paymentMethods
        .filter((m) => m.id === 'CARD')
        .map((m) => ({ ...m, minAmount: MIN_AMOUNT_UAH, maxAmount: MAX_AMOUNT_UAH })),
    [paymentMethods],
  );

  const cardWithdrawMethodsUah = useMemo(
    () =>
      withdrawPaymentMethods
        .filter((m) => m.id === 'CARD')
        .map((m) => ({ ...m, minAmount: MIN_AMOUNT_UAH, maxAmount: MAX_AMOUNT_UAH })),
    [withdrawPaymentMethods],
  );

  const [emailVerified, setEmailVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('email-verified') === '1';
  });
  const [emailConfirming, setEmailConfirming] = useState(false);

  const handleConfirmEmail = async () => {
    setEmailConfirming(true);
    try {
      await new Promise((r) => setTimeout(r, 1400));
      setEmailVerified(true);
      localStorage.setItem('email-verified', '1');
    } finally {
      setEmailConfirming(false);
    }
  };

  const [balance, setBalance] = useState<{ currency: string; balance: number } | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('CARD');
  const [amount, setAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const [withdrawPaymentMethod, setWithdrawPaymentMethod] = useState<PaymentMethodId>('CARD');
  const [withdrawAmount, setWithdrawAmount] = useState('300');
  const [withdrawCardNumber, setWithdrawCardNumber] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [withdrawTwoFactorCode, setWithdrawTwoFactorCode] = useState('');

  const [historyFilter, setHistoryFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');
  const [historyDateValue, setHistoryDateValue] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const historyDateDisplay = (() => {
    const [y, m, d] = historyDateValue.split('-');
    return `${d} / ${m} / ${y}`;
  })();

  const filteredHistoryTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date).toISOString().slice(0, 10);
    const dateMatch = txDate >= historyDateValue;
    const typeMatch =
      historyFilter === 'all' ||
      (historyFilter === 'deposits' && tx.type === 'DEPOSIT') ||
      (historyFilter === 'withdrawals' && tx.type === 'WITHDRAW');
    return dateMatch && typeMatch;
  });

  const WALLET_TABS = useMemo(
    () => [
      { id: 'deposit' as const, label: t('tab_deposit') },
      { id: 'withdraw' as const, label: t('tab_withdraw') },
      { id: 'history' as const, label: t('tab_history') },
    ],
    [t],
  );

  const formatTxMethodLabel = (methodId: string) => {
    const k = methodLabelKey(methodId);
    return k ? t(k) : methodId;
  };

  const txDateLocale = locale === 'ua' ? 'uk-UA' : locale === 'ru' ? 'ru-RU' : 'en-GB';

  const txStatusLabel = (status: string) => {
    if (status === 'CONFIRMED') return t('status_completed');
    if (status === 'PENDING') return t('status_pending');
    return t('status_failed');
  };

  const fetchBalance = () => {
    api<{ currency: string; balance: number }>('/api/wallet/balance')
      .then((res) => setBalance(res))
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = () => {
    api<{ transactions: WalletTransaction[] }>('/api/wallet/transactions')
      .then((res) => setTransactions(res.transactions || []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const refreshTwoFactorFlag = () => {
    api<{ user: { twoFactorEnabled?: boolean } }>('/api/auth/me')
      .then((r) => setTwoFactorEnabled(!!r.user?.twoFactorEnabled))
      .catch(() => setTwoFactorEnabled(false));
  };

  useEffect(() => {
    refreshTwoFactorFlag();
  }, []);

  useEffect(() => {
    if (depositReturnHandledRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const d = params.get('deposit');
    if (!d) return;
    depositReturnHandledRef.current = true;
    if (d === 'success') {
      toast(t('toast_payment_processing'), 'info');
    } else if (d === 'fail') {
      toast(t('toast_payment_failed'), 'error');
    }
    router.replace(pathname);
  }, [pathname, router, t]);

  useEffect(() => {
    const onProfile = () => refreshTwoFactorFlag();
    document.addEventListener('profile-updated', onProfile);
    return () => document.removeEventListener('profile-updated', onProfile);
  }, []);

  useEffect(() => {
    setError(null);
    setSuccess(false);
    setWithdrawTwoFactorCode('');
    setWithdrawCardNumber('');
  }, [walletTab]);

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_AMOUNT_UAH && numAmount <= MAX_AMOUNT_UAH;
  const displayAmount = isValidAmount ? numAmount : 0;
  const totalPay = displayAmount;

  const handleDeposit = async () => {
    if (!isValidAmount) {
      setError(t('err_deposit_range', { min: MIN_AMOUNT_UAH, max: MAX_AMOUNT_UAH }));
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const result = await api<{
        transactionId: string;
        paymentUrl: string;
        status: string;
        amount: number;
        currency: string;
      }>('/api/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: numAmount }),
      });
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      setSuccess(true);
      setAmount('500');
      setPromoCode('');
      setPromoApplied(false);
      fetchBalance();
      fetchTransactions();
      document.dispatchEvent(new CustomEvent('wallet-updated'));
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string; error?: string } } };
      setError(err.response?.data?.message || err.message || t('err_deposit'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(true);
  };

  const withdrawPanDigits = withdrawCardNumber.replace(/\D/g, '');
  const withdrawNumAmount = parseFloat(withdrawAmount) || 0;
  const isValidWithdraw =
    withdrawNumAmount >= MIN_AMOUNT_UAH &&
    withdrawNumAmount <= MAX_AMOUNT_UAH &&
    (balance?.balance ?? 0) >= withdrawNumAmount;
  const withdrawCardOk = withdrawPanDigits.length >= 16 && withdrawPanDigits.length <= 19;
  const withdrawOtpOk = !twoFactorEnabled || /^\d{6}$/.test(withdrawTwoFactorCode);
  const canSubmitWithdraw = isValidWithdraw && withdrawCardOk && withdrawOtpOk;

  const handleWithdraw = async () => {
    if (!isValidWithdraw) {
      setError(
        withdrawNumAmount < MIN_AMOUNT_UAH || withdrawNumAmount > MAX_AMOUNT_UAH
          ? t('err_withdraw_range', { min: MIN_AMOUNT_UAH, max: MAX_AMOUNT_UAH })
          : t('err_insufficient')
      );
      return;
    }
    if (!withdrawCardOk) {
      setError(t('err_card'));
      return;
    }
    if (twoFactorEnabled && !/^\d{6}$/.test(withdrawTwoFactorCode)) {
      setError(t('err_2fa_required'));
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        amount: withdrawNumAmount,
        cardNumber: withdrawPanDigits,
      };
      if (twoFactorEnabled) {
        body.twoFactorCode = withdrawTwoFactorCode;
      }
      await api<{ transactionId: string; status: string; amount: number; currency: string }>(
        '/api/wallet/withdraw',
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );
      setSuccess(true);
      setWithdrawAmount('300');
      setWithdrawCardNumber('');
      setWithdrawTwoFactorCode('');
      fetchBalance();
      fetchTransactions();
      document.dispatchEvent(new CustomEvent('wallet-updated'));
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as {
        message?: string;
        response?: { data?: { message?: string; error?: string } };
      };
      const code = err.response?.data?.error;
      if (code === 'TWO_FACTOR_REQUIRED' || code === 'TWO_FACTOR_INVALID') {
        setError(err.response?.data?.message || t('err_2fa_invalid'));
      } else {
        setError(err.response?.data?.message || err.response?.data?.error || err.message || t('err_withdraw'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMethod = cardDepositMethodsUah.find((m) => m.id === paymentMethod);
  const selectedWithdrawMethod = cardWithdrawMethodsUah.find((m) => m.id === withdrawPaymentMethod);

  if (loading && txLoading) {
    return <WalletPageSkeleton />;
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-0 overflow-x-hidden">
      {/* Левая часть: табы + контент */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Табы */}
        <div className="shrink-0 flex border-b border-white/[0.08] px-4 md:px-8 pt-6 overflow-x-auto overflow-y-hidden">
          {WALLET_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setWalletTab(id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-medium uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                walletTab === id
                  ? 'border-[#3347ff] text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="flex flex-1 min-h-0 overflow-auto">
        {walletTab === 'deposit' && (
          <>
            {/* Левая колонка - форма */}
<div className="flex-1 min-w-0 min-h-0 p-4 md:p-8">
            <div className="w-full">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-6 md:mb-8">{t('deposit_heading')}</h1>

          {/* Email verification banner */}
          {!emailVerified && (
            <div className="mb-6 flex flex-row items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <EnvelopeSimple className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{t('confirm_email_title')}</p>
                  <p className="text-xs text-white/50 mt-0.5">{t('confirm_email_desc')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmEmail}
                disabled={emailConfirming}
                className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {emailConfirming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin shrink-0" />
                    {t('confirming')}
                  </>
                ) : t('confirm_email_btn')}
              </button>
            </div>
          )}
          {emailVerified && (
            <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="fill" />
              <p className="text-sm text-emerald-400 font-medium">{t('email_confirmed_line')}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              {t('deposit_created_msg')}
            </div>
          )}

          {/* Двухколоночный layout: слева - способы оплаты, справа - сумма */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 1. Выбор способа оплаты */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">
                1
              </span>
              <h2 className="text-base font-semibold text-white">{t('choose_payment_method')}</h2>
            </div>
            <div className="max-h-[280px] overflow-y-auto scrollbar-dropdown">
                <div className="grid grid-cols-2 gap-2">
                {cardDepositMethodsUah.map((m) => {
                const isSelected = paymentMethod === m.id;
                const isInstant = m.speed === 'instant'
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`relative flex flex-row items-center gap-3 p-3 rounded-lg text-left border border-white/[0.06] border-l-[3px] h-[72px] transition-colors duration-200 ${
                      isSelected
                        ? 'bg-[#192C5D] border-l-[#3347ff] border-white/20 hover:bg-[#1e3570]'
                        : 'bg-[#0B1734] border-l-transparent hover:bg-[#0f1d3d] hover:border-white/[0.08]'
                    }`}
                  >
                    <div className={`w-10 h-10 shrink-0 rounded-md flex items-center justify-center overflow-hidden ${
                      isSelected ? 'bg-white/10' : 'bg-white/5'
                    }`}>
                      {m.image ? (
                        <img src={m.image} alt="" className="w-8 h-8 object-contain rounded-lg" />
                      ) : (
                        <span className="text-base font-medium text-white/50">{m.label.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
                      <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {m.label}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                          isInstant
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                            : 'text-white/60 bg-white/5 border-white/10'
                        }`}>
                          {m.speedLabel}
                        </span>
                        <span className="inline-flex items-center text-[10px] font-medium text-white/70 shrink-0">
                          {(m.minAmount ?? MIN_AMOUNT_UAH)} - {(m.maxAmount ?? MAX_AMOUNT_UAH)} UAH
                        </span>
                      </div>
                    </div>
                  </button>
                );
                })}
                </div>
            </div>
          </div>

          {/* 2. Ввод суммы */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">
                2
              </span>
              <h2 className="text-sm font-semibold text-white">{t('enter_amount_heading')}</h2>
            </div>
            <div className="space-y-5">
              <div>
                {(() => {
                  const selected = cardDepositMethodsUah.find((m) => m.id === paymentMethod);
                  const minA = selected?.minAmount ?? MIN_AMOUNT_UAH;
                  const maxA = selected?.maxAmount ?? MAX_AMOUNT_UAH;
                  return (
                    <>
                      <label className="block text-sm font-semibold text-white/40 mb-2">
                        {t('amount_deposit_label')}
                      </label>
                      <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={t('placeholder_deposit')}
                          min={minA}
                          max={maxA}
                          step="1"
                          className="flex-1 px-3 py-2.5 bg-transparent text-base text-white placeholder-white/40 focus:outline-none"
                        />
                        <span className="flex items-center pr-3 text-white/50 text-sm">UAH</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-white/40">
                        {t('summary_limits', { min: minA, max: maxA })}
                      </p>
                    </>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-3">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                      amount === String(a)
                        ? 'bg-[#3347ff] text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                    }`}
                  >
                    {a.toLocaleString()} UAH
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoApplied(false);
                  }}
                  placeholder={t('promo_optional')}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                >
                  <Tag className="w-3.5 h-3.5" weight="fill" />
                  {t('apply')}
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Mobile action button (sidebar is hidden on mobile) */}
          <div className="md:hidden mb-8">
            <button
              type="button"
              onClick={handleDeposit}
              disabled={submitting || !isValidAmount || !emailVerified}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('go_to_payment')
              )}
            </button>
          </div>

          {/* Список последних депозитов */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">{t('latest_deposits')}</h2>
              <button
                type="button"
                onClick={() => setWalletTab('history')}
                className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
              >
                {t('show_all')}
                <ArrowSquareOut className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              {txLoading ? (
                <WalletTableSkeleton />
              ) : transactions.filter((txn) => txn.type === 'DEPOSIT').length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">{t('no_deposits')}</div>
              ) : (
                <div className="overflow-x-auto mx-0 px-0">
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_date')}</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_method')}</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_status')}</th>
                      <th className="text-right py-3 px-4 text-white/50 font-medium">{t('th_amount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter((tx) => tx.type === 'DEPOSIT')
                      .map((tx) => (
                        <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-3 px-4 text-white/80">
                            {new Date(tx.date).toLocaleDateString(txDateLocale, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {formatTxMethodLabel(tx.method)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                tx.status === 'CONFIRMED'
                                  ? 'text-emerald-400'
                                  : tx.status === 'PENDING'
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                              }
                            >
                              {txStatusLabel(tx.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400 tabular-nums">
                            +{tx.amount.toFixed(0)} UAH
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

          </>
        )}

        {walletTab === 'withdraw' && (
          <>
            <div className="flex-1 min-w-0 min-h-0 p-4 md:p-8">
              <div className="w-full">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{t('withdraw_heading')}</h1>
                <p className="text-sm text-white/50 mb-8">{t('withdraw_subtitle')}</p>

                {!isVerified ? (
                  <>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-6 md:p-8 mb-6 md:mb-8">
                      <div className="flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                          <SealCheck className="w-7 h-7 text-amber-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">{t('kyc_required_title')}</h2>
                        <p className="text-sm text-white/60 mb-6">{t('kyc_required_desc')}</p>
                        <Link
                          href="/profile?tab=profile#verification"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors"
                        >
                          <SealCheck className="w-4 h-4" />
                          {t('go_verification')}
                        </Link>
                      </div>
                    </div>
                    {/* Последние выводы - показываем и при неверифицированном аккаунте */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">{t('latest_withdrawals_short')}</h2>
                        <button
                          type="button"
                          onClick={() => setWalletTab('history')}
                          className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
                        >
                          {t('show_all')}
                          <ArrowSquareOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                        {txLoading ? (
                          <WalletTableSkeleton />
                        ) : transactions.filter((txn) => txn.type === 'WITHDRAW').length === 0 ? (
                          <div className="p-8 text-center text-white/40 text-sm">{t('no_withdrawals')}</div>
                        ) : (
                          <div className="overflow-x-auto mx-0 px-0">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_date')}</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_method')}</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_status')}</th>
                                  <th className="text-right py-3 px-4 text-white/50 font-medium">{t('th_amount')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transactions
                                  .filter((tx) => tx.type === 'WITHDRAW')
                                  .map((tx) => (
                                    <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                                      <td className="py-3 px-4 text-white/80">
                                        {new Date(tx.date).toLocaleDateString(txDateLocale, {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </td>
                                      <td className="py-3 px-4 text-white/80">
                                        {formatTxMethodLabel(tx.method)}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span
                                          className={
                                            tx.status === 'CONFIRMED'
                                              ? 'text-emerald-400'
                                              : tx.status === 'PENDING'
                                                ? 'text-amber-400'
                                                : 'text-red-400'
                                          }
                                        >
                                          {txStatusLabel(tx.status)}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-right font-medium text-red-400 tabular-nums">
                                        -{tx.amount.toFixed(0)} UAH
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                <>
                {error && (
                  <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {t('withdraw_accepted')}
                  </div>
                )}

                {/* Двухколоночный layout: слева - способы вывода, справа - сумма */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* 1. Выбор способа вывода */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">1</span>
                    <h2 className="text-base font-semibold text-white">{t('choose_withdraw_method')}</h2>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto scrollbar-dropdown">
                      <div className="grid grid-cols-2 gap-2">
                        {cardWithdrawMethodsUah.map((m) => {
                          const isSelected = withdrawPaymentMethod === m.id;
                          const isInstant = m.speed === 'instant'
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setWithdrawPaymentMethod(m.id)}
                              className={`relative flex flex-row items-center gap-3 p-3 rounded-lg text-left border border-white/[0.06] border-l-[3px] h-[72px] transition-colors duration-200 ${
                                isSelected
                                  ? 'bg-[#192C5D] border-l-[#3347ff] border-white/20 hover:bg-[#1e3570]'
                                  : 'bg-[#0B1734] border-l-transparent hover:bg-[#0f1d3d] hover:border-white/[0.08]'
                              }`}
                            >
                              <div className={`w-10 h-10 shrink-0 rounded-md flex items-center justify-center overflow-hidden ${
                                isSelected ? 'bg-white/10' : 'bg-white/5'
                              }`}>
                                {m.image ? (
                                  <img src={m.image} alt="" className="w-8 h-8 object-contain rounded-lg" />
                                ) : (
                                  <span className="text-base font-medium text-white/50">{m.label.charAt(0)}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1 overflow-hidden">
                                <p className={`text-sm font-semibold leading-tight truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                  {m.label}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                                    isInstant
                                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                      : 'text-white/60 bg-white/5 border-white/10'
                                  }`}>
                                    {m.speedLabel}
                                  </span>
                                  <span className="inline-flex items-center text-[10px] font-medium text-white/70 shrink-0">
                                    {(m.minAmount ?? MIN_AMOUNT_UAH)} - {(m.maxAmount ?? MAX_AMOUNT_UAH)} UAH
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                  </div>
                </div>

                {/* 2. Сумма вывода */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">2</span>
                    <h2 className="text-sm font-semibold text-white">{t('enter_amount_heading')}</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      {(() => {
                        const selected = cardWithdrawMethodsUah.find((m) => m.id === withdrawPaymentMethod);
                        const minA = selected?.minAmount ?? MIN_AMOUNT_UAH;
                        const maxA = selected?.maxAmount ?? MAX_AMOUNT_UAH;
                        return (
                          <>
                            <label className="block text-sm font-semibold text-white/40 mb-2">
                              {t('amount_withdraw_label')}
                            </label>
                            <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder={t('placeholder_withdraw')}
                                min={minA}
                                max={maxA}
                                step="1"
                                className="flex-1 px-3 py-2.5 bg-transparent text-base text-white placeholder-white/40 focus:outline-none"
                              />
                              <span className="flex items-center pr-3 text-white/50 text-sm">UAH</span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-white/40">
                              {t('withdraw_limits_hint', {
                                min: minA,
                                max: maxA,
                                available: (balance?.balance ?? 0).toFixed(0),
                              })}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-5">
                      <label className="block text-sm font-semibold text-white/40 mb-2">
                        {t('recipient_card')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={t('card_digits_placeholder')}
                        value={withdrawCardNumber}
                        onChange={(e) => setWithdrawCardNumber(e.target.value.replace(/[^\d\s]/g, '').slice(0, 23))}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-sm tracking-wide placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {QUICK_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setWithdrawAmount(String(a))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                            withdrawAmount === String(a)
                              ? 'bg-[#3347ff] text-white'
                              : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {a.toLocaleString()} UAH
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {twoFactorEnabled && (
                  <div className="col-span-2 rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 md:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold">
                        3
                      </span>
                      <h2 className="text-base font-semibold text-white">{t('ga_code_block_title')}</h2>
                    </div>
                    <p className="text-xs text-white/50 mb-3">{t('ga_required_withdraw')}</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={withdrawTwoFactorCode}
                      onChange={(e) => setWithdrawTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full max-w-[220px] px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                    />
                  </div>
                )}
                </div>

                {/* Mobile action button for withdrawal */}
                <div className="md:hidden mb-8">
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={submitting || !canSubmitWithdraw}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      t('confirm_withdraw_btn')
                    )}
                  </button>
                </div>

                {/* Список последних выводов */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white">{t('latest_withdrawals_short')}</h2>
                    <button
                      type="button"
                      onClick={() => setWalletTab('history')}
                      className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
                    >
                      {t('show_all')}
                      <ArrowSquareOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                      {txLoading ? (
                          <WalletTableSkeleton />
                        ) : transactions.filter((txn) => txn.type === 'WITHDRAW').length === 0 ? (
                          <div className="p-8 text-center text-white/40 text-sm">{t('no_withdrawals')}</div>
                        ) : (
                          <div className="overflow-x-auto mx-0 px-0">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_date')}</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_method')}</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">{t('th_status')}</th>
                                  <th className="text-right py-3 px-4 text-white/50 font-medium">{t('th_amount')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions
                              .filter((tx) => tx.type === 'WITHDRAW')
                              .map((tx) => (
                                <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                                  <td className="py-3 px-4 text-white/80">
                                    {new Date(tx.date).toLocaleDateString(txDateLocale, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-white/80">
                                    {formatTxMethodLabel(tx.method)}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={
                                        tx.status === 'CONFIRMED'
                                          ? 'text-emerald-400'
                                          : tx.status === 'PENDING'
                                            ? 'text-amber-400'
                                            : 'text-red-400'
                                      }
                                    >
                                      {txStatusLabel(tx.status)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium text-red-400 tabular-nums">
                                    -{tx.amount.toFixed(0)} UAH
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
                </>
                )}
              </div>
            </div>
          </>
        )}

        {walletTab === 'history' && (
          <div className="flex-1 min-w-0 min-h-0 p-4 md:p-8 w-full">
            <div className="w-full">
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{t('history_heading')}</h1>
              <p className="text-sm text-white/50 mb-8">{t('history_subtitle')}</p>

              {/* Табы фильтра и дата */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'deposits', 'withdrawals'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setHistoryFilter(f)}
                      className={`px-4 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors ${
                        historyFilter === f
                          ? 'bg-[#3347ff] text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {f === 'all' ? t('filter_all') : f === 'deposits' ? t('filter_deposits') : t('filter_withdrawals')}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={historyDateValue}
                    onChange={(e) => setHistoryDateValue(e.target.value)}
                    className="sr-only peer"
                    id="history-date-input"
                  />
                  <label
                    htmlFor="history-date-input"
                    title={t('history_calendar_hint')}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-white/50" />
                    <span>{historyDateDisplay}</span>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-[#030E28] overflow-hidden">
                {txLoading ? (
                  <div className="py-6">
                    <WalletTableSkeleton rows={5} />
                  </div>
                ) : filteredHistoryTransactions.length === 0 ? (
                  <div className="p-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <ClockCounterClockwise className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white">{t('empty_history_title')}</p>
                    <p className="text-sm text-white/50 mt-1">{t('empty_history_hint')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mx-0">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('th_date')}</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('th_type')}</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('th_method')}</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('th_status')}</th>
                          <th className="text-right py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('th_amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistoryTransactions.map((tx) => {
                          const isDeposit = tx.type === 'DEPOSIT';
                          return (
                            <tr
                              key={tx.id}
                              className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                            >
                              <td className="py-4 px-5">
                                <span className="text-white/90 text-sm">
                                  {new Date(tx.date).toLocaleDateString(txDateLocale, {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </td>
                              <td className="py-4 px-5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    isDeposit
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {isDeposit ? t('tx_deposit') : t('tx_withdraw')}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-white/80 text-sm">
                                {formatTxMethodLabel(tx.method)}
                              </td>
                              <td className="py-4 px-5">
                                <span
                                  className={`text-sm font-medium ${
                                    tx.status === 'CONFIRMED'
                                      ? 'text-emerald-400'
                                      : tx.status === 'PENDING'
                                        ? 'text-amber-400'
                                        : 'text-red-400'
                                  }`}
                                >
                                  {txStatusLabel(tx.status)}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right">
                                <span
                                  className={`font-semibold tabular-nums text-sm ${
                                    isDeposit ? 'text-emerald-400' : 'text-amber-400'
                                  }`}
                                >
                                  {isDeposit ? '+' : '−'}{tx.amount.toFixed(0)} UAH
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Правая часть - Summary (от хедера до низа, только для Пополнение и Вывод; для Вывода - только если верифицирован) */}
      {((walletTab === 'deposit') || (walletTab === 'withdraw' && isVerified)) && (
        <div className="hidden md:flex w-[320px] shrink-0 px-4 py-6 flex-col gap-6 self-stretch min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f] border-l border-white/10 sticky top-0">
          {walletTab === 'deposit' && (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-[#030E28] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">{t('summary')}</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {t('summary_limits', { min: MIN_AMOUNT_UAH, max: MAX_AMOUNT_UAH })}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_method')}</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedMethod?.mask || selectedMethod?.label || paymentMethod}
                      </span>
                      {selectedMethod?.speedLabel && (
                        <span className="text-xs text-white/50">{selectedMethod.speedLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_amount')}</span>
                    <span className="text-white font-medium tabular-nums">
                      {displayAmount.toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_fee')}</span>
                    <span className="text-emerald-400 font-medium">{t('fee_free')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">{t('to_pay')}</span>
                    <span className="text-xl font-bold text-[#3347ff] tabular-nums">
                      {totalPay.toFixed(0)} UAH
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={submitting || !isValidAmount || !emailVerified}
                  className="group relative w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <span className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        {t('go_to_payment')}
                        <CaretRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  {t('agree_terms')}{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">{t('terms_of_use')}</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">{t('secure_pay_title')}</p>
                  <p className="text-xs text-white/50 mt-0.5">{t('secure_pay_desc')}</p>
                </div>
              </div>
              <a href="#" className="block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors">
                <img src="/images/banner1.PNG" alt="" className="w-full h-auto object-cover rounded-xl" />
              </a>
            </>
          )}
          {walletTab === 'withdraw' && (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-[#030E28] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">{t('summary')}</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {t('summary_limits', { min: MIN_AMOUNT_UAH, max: MAX_AMOUNT_UAH })}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_method')}</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedWithdrawMethod?.mask || selectedWithdrawMethod?.label || withdrawPaymentMethod}
                      </span>
                      {selectedWithdrawMethod?.speedLabel && (
                        <span className="text-xs text-white/50">{selectedWithdrawMethod.speedLabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_amount')}</span>
                    <span className="text-white font-medium tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{t('lbl_fee')}</span>
                    <span className="text-emerald-400 font-medium">{t('fee_free')}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">{t('to_receive')}</span>
                    <span className="text-xl font-bold text-[#3347ff] tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                </div>
                {twoFactorEnabled && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs font-medium text-white/60 mb-2">{t('ga_code_block_title')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={withdrawTwoFactorCode}
                      onChange={(e) => setWithdrawTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={submitting || !canSubmitWithdraw}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('processing')}
                    </>
                  ) : (
                    t('confirm_withdraw_btn')
                  )}
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  {t('agree_terms')}{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">{t('terms_of_use')}</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">{t('secure_withdraw_title')}</p>
                  <p className="text-xs text-white/50 mt-0.5">{t('secure_pay_desc')}</p>
                </div>
              </div>
              <a href="#" className="block rounded-xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-colors">
                <img src="/images/banner1.PNG" alt="" className="w-full h-auto object-cover rounded-xl" />
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
