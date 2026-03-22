'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/components/navigation';
import { Tag, ExternalLink, History, ChevronRight, Shield, FileCheck, Calendar, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/api';
import { useIsVerified } from '@/lib/hooks/useVerification';

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

const PAYMENT_METHODS: Array<{
  id: PaymentMethodId;
  label: string;
  mask?: string;
  image?: string;
  speed: string;
  minAmount?: number;
  maxAmount?: number;
}> = [
  { id: 'CARD', label: 'Карта Visa/Master', image: '/images/visa%20master.webp', speed: 'Мгновенно', minAmount: 200, maxAmount: 1000 },
  { id: 'PRIVAT24', label: 'Privat24', image: '/images/privat24.png', speed: 'Мгновенно', minAmount: 200, maxAmount: 1000 },
  { id: 'CARD_UAH', label: 'Перевод на карту (UAH)', image: '/images/creditcard.png', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'BINANCE_PAY', label: 'Binance Pay', image: '/images/binancepay.png', speed: 'Мгновенно', minAmount: 200, maxAmount: 1000 },
  { id: 'USDT_TRC20', label: 'Tether (TRC-20)', image: '/images/tether.png', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'BTC', label: 'Bitcoin', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'ETH', label: 'Ethereum', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'USDC', label: 'USD Coin', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'BNB', label: 'BNB', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'XRP', label: 'XRP', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'SOL', label: 'Solana', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'DOGE', label: 'Dogecoin', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'ADA', label: 'Cardano', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'AVAX', label: 'Avalanche', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'MATIC', label: 'Polygon', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'LTC', label: 'Litecoin', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
  { id: 'DOT', label: 'Polkadot', speed: '1-5 мин', minAmount: 200, maxAmount: 1000 },
];

const WITHDRAW_PAYMENT_METHODS = PAYMENT_METHODS.filter((m) =>
  ['CARD', 'PRIVAT24', 'CARD_UAH', 'BINANCE_PAY', 'USDT_TRC20'].includes(m.id)
);

const MIN_AMOUNT_UAH = 200;
const MAX_AMOUNT_UAH = 1000;
const QUICK_AMOUNTS = [200, 500, 1000];

const METHOD_LABELS: Record<string, string> = {
  CARD: 'Карта Visa/Master',
  PRIVAT24: 'Privat24',
  CARD_UAH: 'Перевод на карту (UAH)',
  BINANCE_PAY: 'Binance Pay',
  USDT_TRC20: 'Tether (TRC-20)',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDC: 'USD Coin',
  BNB: 'BNB',
  XRP: 'XRP',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  MATIC: 'Polygon',
  LTC: 'Litecoin',
  DOT: 'Polkadot',
};

function WalletPageSkeleton() {
  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Tab bar */}
        <div className="shrink-0 flex border-b border-white/[0.08] px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 gap-1">
          {[112, 96, 148].map((w) => (
            <div key={w} className={`h-9 w-[${w}px] rounded-t-lg bg-white/5 animate-pulse mb-px`} style={{ width: w }} />
          ))}
        </div>

        <div className="flex-1 min-h-0 p-3 sm:p-6 md:p-8 overflow-auto">
          <div className="w-full">
            {/* Title */}
            <div className="h-8 w-52 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-4 w-80 bg-white/5 rounded animate-pulse mb-6 sm:mb-8" />

            {/* Two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-6 sm:mb-8">
              {/* Payment methods */}
              <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-5 w-44 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-[72px] rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Amount input */}
              <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                  <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                  <div className="h-5 w-36 bg-white/10 rounded animate-pulse" />
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="h-3 w-44 bg-white/5 rounded animate-pulse mb-2" />
                    <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
                    <div className="h-3 w-32 bg-white/5 rounded animate-pulse mt-1.5" />
                  </div>
                  <div className="flex gap-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 w-24 rounded-lg bg-white/5 animate-pulse" />
                    ))}
                  </div>
                  <div className="h-9 w-full bg-white/5 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>

            {/* Recent transactions header + table */}
            <div className="flex justify-between items-center mb-4">
              <div className="h-5 w-44 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-10 bg-white/5 rounded animate-pulse" />
            </div>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              <WalletTableSkeleton rows={4} />
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="hidden lg:flex w-[320px] shrink-0 px-4 py-6 flex-col gap-6 bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f] border-l border-white/10">
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
  const isVerified = useIsVerified();
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
  const [withdrawAmount, setWithdrawAmount] = useState('200');

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

  const WALLET_TABS = [
    { id: 'deposit' as const, label: 'Пополнение' },
    { id: 'withdraw' as const, label: 'Вывод' },
    { id: 'history' as const, label: 'История транзакций' },
  ];

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

  useEffect(() => {
    setError(null);
    setSuccess(false);
  }, [walletTab]);

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= MIN_AMOUNT_UAH && numAmount <= MAX_AMOUNT_UAH;
  const displayAmount = isValidAmount ? numAmount : 0;
  const totalPay = displayAmount;

  const handleDeposit = async () => {
    if (!isValidAmount) {
      setError(`Сумма пополнения: от ${MIN_AMOUNT_UAH} до ${MAX_AMOUNT_UAH} UAH`);
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api<{ transactionId: string; status: string; amount: number; currency: string }>(
        '/api/wallet/deposit',
        {
          method: 'POST',
          body: JSON.stringify({ amount: numAmount, paymentMethod }),
        }
      );
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
      setError(err.response?.data?.message || err.message || 'Ошибка пополнения');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setPromoApplied(true);
  };

  const withdrawNumAmount = parseFloat(withdrawAmount) || 0;
  const isValidWithdraw = withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH && (balance?.balance ?? 0) >= withdrawNumAmount;

  const handleWithdraw = async () => {
    if (!isValidWithdraw) {
      setError(
        withdrawNumAmount < MIN_AMOUNT_UAH || withdrawNumAmount > MAX_AMOUNT_UAH
          ? `Сумма вывода: от ${MIN_AMOUNT_UAH} до ${MAX_AMOUNT_UAH} UAH`
          : 'Недостаточно средств на счёте'
      );
      return;
    }
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await api<{ transactionId: string; status: string; amount: number; currency: string }>(
        '/api/wallet/withdraw',
        {
          method: 'POST',
          body: JSON.stringify({ amount: withdrawNumAmount, paymentMethod: withdrawPaymentMethod }),
        }
      );
      setSuccess(true);
      setWithdrawAmount('200');
      fetchBalance();
      fetchTransactions();
      document.dispatchEvent(new CustomEvent('wallet-updated'));
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string; error?: string } } };
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Ошибка вывода');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
  const selectedWithdrawMethod = WITHDRAW_PAYMENT_METHODS.find((m) => m.id === withdrawPaymentMethod);

  if (loading && txLoading) {
    return <WalletPageSkeleton />;
  }

  return (
    <div className="flex flex-row w-full h-full min-h-0">
      {/* Левая часть: табы + контент */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {/* Табы */}
        <div className="shrink-0 flex border-b border-white/[0.08] px-3 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-6 overflow-x-auto overflow-y-hidden">
          {WALLET_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setWalletTab(id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-3 text-[10px] sm:text-xs font-medium uppercase tracking-wider border-b-2 transition-colors -mb-px ${
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
<div className="flex-1 min-w-0 min-h-0 p-3 sm:p-6 md:p-8">
            <div className="w-full">
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Пополнение счёта</h1>
          <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
            Выберите способ оплаты и введите сумму для безопасного пополнения.
          </p>

          {/* Email verification banner */}
          {!emailVerified && (
            <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">Подтвердите email</p>
                  <p className="text-xs text-white/50 mt-0.5">Для совершения депозита необходимо подтвердить почту</p>
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
                    Подтверждение...
                  </>
                ) : 'Подтвердить'}
              </button>
            </div>
          )}
          {emailVerified && (
            <div className="mb-5 sm:mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400 font-medium">Email подтверждён</p>
            </div>
          )}

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
              Депозит успешно создан. Средства поступят после подтверждения платёжной системой.
            </div>
          )}

          {/* Двухколоночный layout: слева - способы оплаты, справа - сумма */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-5 sm:mb-8">
          {/* 1. Выбор способа оплаты */}
          <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">
                1
              </span>
              <h2 className="text-base font-semibold text-white">Выберите способ оплаты</h2>
            </div>
            <div className="relative">
              <div className="max-h-[280px] overflow-y-auto scrollbar-dropdown">
                <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => {
                const isSelected = paymentMethod === m.id;
                const isInstant = m.speed === 'Мгновенно';
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
                          {m.speed}
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
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#030E28] via-[#030E28]/60 to-transparent pointer-events-none rounded-b-xl" />
            </div>
          </div>

          {/* 2. Ввод суммы */}
          <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">
                2
              </span>
              <h2 className="text-sm font-semibold text-white">Введите сумму</h2>
            </div>
            <div className="space-y-5">
              <div>
                {(() => {
                  const selected = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
                  const minA = selected?.minAmount ?? MIN_AMOUNT_UAH;
                  const maxA = selected?.maxAmount ?? MAX_AMOUNT_UAH;
                  return (
                    <>
                      <label className="block text-sm font-semibold text-white/40 mb-2">
                        Сумма пополнения (UAH)
                      </label>
                      <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Введите сумму для пополнения"
                          min={minA}
                          max={maxA}
                          step="1"
                          className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none"
                        />
                        <span className="flex items-center pr-2 sm:pr-3 text-white/50 text-xs sm:text-sm">UAH</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-white/40">От {minA} до {maxA} UAH</p>
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
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoApplied(false);
                  }}
                  placeholder="Промо-код (необязательно)"
                  className="flex-1 min-w-0 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#3347ff]/50 focus:border-[#3347ff]/50"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shrink-0"
                >
                  <Tag className="w-3.5 h-3.5" />
                  ПРИМЕНИТЬ
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Кнопка оплаты - на мобилке (на десктопе в сайдбаре) */}
          <div className="lg:hidden mb-5 sm:mb-8">
            <div className="rounded-lg sm:rounded-xl border border-white/[0.08] bg-[#030E28] p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60 text-sm">К оплате</span>
                <span className="text-lg font-bold text-[#3347ff] tabular-nums">{totalPay.toFixed(0)} UAH</span>
              </div>
              <button
                type="button"
                onClick={handleDeposit}
                disabled={submitting || !isValidAmount || !emailVerified}
                className="w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl btn-accent text-white text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    Перейти к оплате
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Список последних депозитов */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Последние пополнения</h2>
              <button
                type="button"
                onClick={() => setWalletTab('history')}
                className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
              >
                ВСЕ
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
              {txLoading ? (
                <WalletTableSkeleton />
              ) : transactions.filter((t) => t.type === 'DEPOSIT').length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">Нет пополнений</div>
              ) : (
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                <table className="w-full text-sm min-w-[360px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Дата</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Способ</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Статус</th>
                      <th className="text-right py-3 px-4 text-white/50 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter((tx) => tx.type === 'DEPOSIT')
                      .map((tx) => (
                        <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-3 px-4 text-white/80">
                            {new Date(tx.date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {METHOD_LABELS[tx.method] || tx.method}
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
                              {tx.status === 'CONFIRMED'
                                ? 'Завершено'
                                : tx.status === 'PENDING'
                                  ? 'В обработке'
                                  : 'Ошибка'}
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
            <div className="flex-1 min-w-0 min-h-0 p-3 sm:p-6 md:p-8">
              <div className="w-full">
                <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">Вывод средств</h1>
                <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
                  Выберите способ вывода и введите сумму.
                </p>

                {!isVerified ? (
                  <>
                    <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-6 sm:p-8 mb-5 sm:mb-8">
                      <div className="flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                          <FileCheck className="w-7 h-7 text-amber-400" strokeWidth={2} />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">Требуется верификация</h2>
                        <p className="text-sm text-white/60 mb-6">
                          Для вывода средств необходимо пройти верификацию аккаунта. Это стандартная процедура KYC, которая повышает безопасность платформы и позволяет выводить средства.
                        </p>
                        <Link
                          href="/profile?tab=profile#verification"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-sm font-medium uppercase tracking-wider transition-colors"
                        >
                          <FileCheck className="w-4 h-4" />
                          Пройти верификацию
                        </Link>
                      </div>
                    </div>
                    {/* Последние выводы - показываем и при неверифицированном аккаунте */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">Последние выводы</h2>
                        <button
                          type="button"
                          onClick={() => setWalletTab('history')}
                          className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
                        >
                          ВСЕ
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                        {txLoading ? (
                          <WalletTableSkeleton />
                        ) : transactions.filter((t) => t.type === 'WITHDRAW').length === 0 ? (
                          <div className="p-8 text-center text-white/40 text-sm">Нет выводов</div>
                        ) : (
                          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Дата</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Способ</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Статус</th>
                                  <th className="text-right py-3 px-4 text-white/50 font-medium">Сумма</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transactions
                                  .filter((tx) => tx.type === 'WITHDRAW')
                                  .map((tx) => (
                                    <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                                      <td className="py-3 px-4 text-white/80">
                                        {new Date(tx.date).toLocaleDateString('ru-RU', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </td>
                                      <td className="py-3 px-4 text-white/80">
                                        {METHOD_LABELS[tx.method] || tx.method}
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
                                          {tx.status === 'CONFIRMED'
                                            ? 'Завершено'
                                            : tx.status === 'PENDING'
                                              ? 'В обработке'
                                              : 'Ошибка'}
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
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm">
                    Заявка на вывод создана. Средства будут переведены в течение 1-3 рабочих дней.
                  </div>
                )}

                {/* Двухколоночный layout: слева - способы вывода, справа - сумма */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-5 sm:mb-8">
                {/* 1. Выбор способа вывода */}
                <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-sm font-bold">1</span>
                    <h2 className="text-base font-semibold text-white">Выберите способ вывода</h2>
                  </div>
                  <div className="relative">
                    <div className="max-h-[280px] overflow-y-auto scrollbar-dropdown">
                      <div className="grid grid-cols-2 gap-2">
                        {WITHDRAW_PAYMENT_METHODS.map((m) => {
                          const isSelected = withdrawPaymentMethod === m.id;
                          const isInstant = m.speed === 'Мгновенно';
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
                                    {m.speed}
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
                    <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#030E28] via-[#030E28]/60 to-transparent pointer-events-none rounded-b-xl" />
                  </div>
                </div>

                {/* 2. Сумма вывода */}
                <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4 sm:mb-5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#3347ff]/30 text-[#7b8fff] text-xs font-bold">2</span>
                    <h2 className="text-sm font-semibold text-white">Введите сумму</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      {(() => {
                        const selected = WITHDRAW_PAYMENT_METHODS.find((m) => m.id === withdrawPaymentMethod);
                        const minA = selected?.minAmount ?? MIN_AMOUNT_UAH;
                        const maxA = selected?.maxAmount ?? MAX_AMOUNT_UAH;
                        return (
                          <>
                            <label className="block text-sm font-semibold text-white/40 mb-2">
                              Сумма вывода (UAH)
                            </label>
                            <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-[#3347ff]/50 focus-within:border-[#3347ff]/50">
                              <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Введите сумму для вывода"
                                min={minA}
                                max={maxA}
                                step="1"
                                className="flex-1 px-2 sm:px-3 py-2 sm:py-2.5 bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none"
                              />
                              <span className="flex items-center pr-2 sm:pr-3 text-white/50 text-xs sm:text-sm">UAH</span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-white/40">От {minA} до {maxA} UAH. Доступно: {(balance?.balance ?? 0).toFixed(0)} UAH</p>
                          </>
                        );
                      })()}
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
                </div>

                {/* Кнопка вывода - на мобилке */}
                <div className="lg:hidden mb-5 sm:mb-8">
                  <div className="rounded-lg sm:rounded-xl border border-white/[0.08] bg-[#030E28] p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">К получению</span>
                    <span className="text-lg font-bold text-[#3347ff] tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={submitting || !isValidWithdraw}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-accent text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Обработка...
                      </>
                    ) : (
                      'Подтвердить вывод'
                    )}
                  </button>
                  </div>
                </div>

                {/* Список последних выводов */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white">Последние выводы</h2>
                    <button
                      type="button"
                      onClick={() => setWalletTab('history')}
                      className="text-xs font-medium uppercase tracking-wider text-[#7b8fff] hover:text-[#9ba8ff] transition-colors flex items-center gap-1"
                    >
                      ВСЕ
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                      {txLoading ? (
                          <WalletTableSkeleton />
                        ) : transactions.filter((t) => t.type === 'WITHDRAW').length === 0 ? (
                          <div className="p-8 text-center text-white/40 text-sm">Нет выводов</div>
                        ) : (
                          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr className="border-b border-white/[0.06]">
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Дата</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Способ</th>
                                  <th className="text-left py-3 px-4 text-white/50 font-medium">Статус</th>
                                  <th className="text-right py-3 px-4 text-white/50 font-medium">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {transactions
                              .filter((tx) => tx.type === 'WITHDRAW')
                              .map((tx) => (
                                <tr key={tx.id} className="border-b border-white/[0.04] last:border-0">
                                  <td className="py-3 px-4 text-white/80">
                                    {new Date(tx.date).toLocaleDateString('ru-RU', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </td>
                                  <td className="py-3 px-4 text-white/80">
                                    {METHOD_LABELS[tx.method] || tx.method}
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
                                      {tx.status === 'CONFIRMED'
                                        ? 'Завершено'
                                        : tx.status === 'PENDING'
                                          ? 'В обработке'
                                          : 'Ошибка'}
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
          <div className="flex-1 min-w-0 min-h-0 p-3 sm:p-6 md:p-8 w-full">
            <div className="w-full">
              <h1 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">История транзакций</h1>
              <p className="text-xs sm:text-sm text-white/50 mb-5 sm:mb-8">
                Все пополнения и выводы средств
              </p>

              {/* Табы фильтра и дата */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 sm:mb-6">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'deposits', 'withdrawals'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setHistoryFilter(f)}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-medium uppercase tracking-wider transition-colors ${
                        historyFilter === f
                          ? 'bg-[#3347ff] text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/10'
                      }`}
                    >
                      {f === 'all' ? 'Все' : f === 'deposits' ? 'Пополнения' : 'Выводы'}
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
                      <History className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white">Нет транзакций</p>
                    <p className="text-sm text-white/50 mt-1">Пополнения и выводы появятся здесь</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Дата</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Тип</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Способ</th>
                          <th className="text-left py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Статус</th>
                          <th className="text-right py-4 px-5 text-[11px] font-semibold text-white/50 uppercase tracking-wider">Сумма</th>
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
                                  {new Date(tx.date).toLocaleDateString('ru-RU', {
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
                                  {isDeposit ? 'Пополнение' : 'Вывод'}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-white/80 text-sm">
                                {METHOD_LABELS[tx.method] || tx.method}
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
                                  {tx.status === 'CONFIRMED'
                                    ? 'Завершено'
                                    : tx.status === 'PENDING'
                                      ? 'В обработке'
                                      : 'Ошибка'}
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
        <div className="hidden lg:flex w-[320px] shrink-0 px-4 py-6 flex-col gap-6 self-stretch min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-[#0a1638] via-[#07152f] to-[#040d1f] border-l border-white/10 sticky top-0">
          {walletTab === 'deposit' && (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-[#030E28] p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Итого</h3>
                  <p className="text-xs text-white/50 mt-0.5">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Способ</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedMethod?.mask || selectedMethod?.label || paymentMethod}
                      </span>
                      {selectedMethod?.speed && (
                        <span className="text-xs text-white/50">{selectedMethod.speed}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Сумма</span>
                    <span className="text-white font-medium tabular-nums">
                      {displayAmount.toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Комиссия</span>
                    <span className="text-emerald-400 font-medium">Бесплатно</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">К оплате</span>
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
                        Обработка...
                      </>
                    ) : (
                      <>
                        Перейти к оплате
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  Нажимая «Подтвердить», вы соглашаетесь с{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">Условиями использования</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">Безопасный платёж</p>
                  <p className="text-xs text-white/50 mt-0.5">256-bit SSL шифрование. Ваши данные защищены.</p>
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
                  <h3 className="text-lg font-semibold text-white">Итого</h3>
                  <p className="text-xs text-white/50 mt-0.5">От {MIN_AMOUNT_UAH} до {MAX_AMOUNT_UAH} UAH</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Способ</span>
                    <div className="text-right">
                      <span className="text-white font-medium block">
                        {selectedWithdrawMethod?.mask || selectedWithdrawMethod?.label || withdrawPaymentMethod}
                      </span>
                      {selectedWithdrawMethod?.speed && (
                        <span className="text-xs text-white/50">{selectedWithdrawMethod.speed}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Сумма</span>
                    <span className="text-white font-medium tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Комиссия</span>
                    <span className="text-emerald-400 font-medium">Бесплатно</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <span className="text-white font-semibold">К получению</span>
                    <span className="text-xl font-bold text-[#3347ff] tabular-nums">
                      {(withdrawNumAmount >= MIN_AMOUNT_UAH && withdrawNumAmount <= MAX_AMOUNT_UAH ? withdrawNumAmount : 0).toFixed(0)} UAH
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={submitting || !isValidWithdraw}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3347ff] hover:bg-[#3347ff]/90 text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Обработка...
                    </>
                  ) : (
                    'Подтвердить вывод'
                  )}
                </button>
                <p className="mt-4 text-[11px] text-white/40 text-center">
                  Нажимая «Подтвердить», вы соглашаетесь с{' '}
                  <Link href="#" className="text-[#7b8fff] hover:underline">Условиями использования</Link>.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <p className="font-medium text-white/90 text-sm">Безопасный вывод</p>
                  <p className="text-xs text-white/50 mt-0.5">256-bit SSL шифрование. Ваши данные защищены.</p>
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
