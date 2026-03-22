'use client';

/**
 * Toast notifications - заменяет window.alert()
 * Неблокирующие уведомления в углу экрана
 */

import { X, AlertCircle, CheckCircle, Info, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { useToastStore, type ToastType } from '@/stores/toast.store';

const typeConfig: Record<ToastType, { icon: typeof AlertCircle; leftBorder: string }> = {
  error: { icon: AlertCircle, leftBorder: 'border-l-red-400' },
  success: { icon: CheckCircle, leftBorder: 'border-l-emerald-400' },
  warning: { icon: AlertTriangle, leftBorder: 'border-l-amber-400' },
  info: { icon: Info, leftBorder: 'border-l-blue-400' },
  'trade-open': { icon: CheckCircle, leftBorder: 'border-l-slate-400' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-14 left-[6.5rem] z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-[260px]"
      aria-live="polite"
      aria-label="Уведомления"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => useToastStore.getState().dismiss(t.id)}
        />
      ))}
    </div>
  );
}

function formatInstrument(instrument: string): string {
  if (instrument.length === 6 && /^[A-Z]{6}$/.test(instrument)) {
    return `${instrument.slice(0, 3)}/${instrument.slice(3)} OTC`;
  }
  return instrument;
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: import('@/stores/toast.store').Toast;
  onDismiss: () => void;
}) {
  const config = typeConfig[toast.type];
  const Icon = config.icon;
  const isTradeOpen = toast.type === 'trade-open' && toast.tradeOpen;

  if (isTradeOpen && toast.tradeOpen) {
    const { instrument, direction, amount } = toast.tradeOpen;
    const DirIcon = direction === 'CALL' ? TrendingUp : TrendingDown;
    const amountStr = amount ? `$${amount}` : '';
    const isCall = direction === 'CALL';
    const leftBorder = isCall ? 'border-l-emerald-400' : 'border-l-red-400';

    return (
      <div
        className={`pointer-events-auto rounded-r-md border-l-4 pl-3 pr-2.5 py-3 shadow-lg bg-[#0d1626]/90 backdrop-blur-md ${leftBorder} animate-in slide-in-from-bottom-2 fade-in duration-200`}
        role="alert"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/60 uppercase tracking-wide">
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            Сделка открыта
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-2 mt-0.5">
          <p className="text-sm font-semibold text-white">
            {formatInstrument(instrument)}
          </p>
          <span className="text-sm text-white/95 flex items-center gap-1">
            {amountStr}
            <DirIcon className={`h-4 w-4 shrink-0 ${isCall ? 'text-emerald-400' : 'text-red-400'}`} aria-hidden />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 min-h-[48px] rounded-r-md border-l-4 pl-3 pr-2.5 py-3 shadow-lg bg-[#0d1626]/90 backdrop-blur-md ${config.leftBorder} animate-in slide-in-from-bottom-2 fade-in duration-200`}
      role="alert"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/90" />
      <p className="flex-1 text-sm font-medium text-white/95 leading-snug truncate" title={toast.message}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Hook for components that need to show toasts */
export function useToast() {
  return useToastStore((s) => ({ toast: s.toast, dismiss: s.dismiss }));
}
