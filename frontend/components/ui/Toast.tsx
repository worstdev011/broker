'use client';

/**
 * Toast notifications - заменяет window.alert()
 * Неблокирующие уведомления в углу экрана
 */

import { X, WarningCircle, CheckCircle, Info, Warning, TrendDown, TrendUp } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useToastStore, type ToastType } from '@/stores/toast.store';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

const typeConfig: Record<ToastType, { icon: typeof WarningCircle; leftBorder: string }> = {
  error: { icon: WarningCircle, leftBorder: 'border-l-[#ff3d1f]' },
  success: { icon: CheckCircle, leftBorder: 'border-l-[#45b833]' },
  warning: { icon: Warning, leftBorder: 'border-l-amber-400' },
  info: { icon: Info, leftBorder: 'border-l-blue-400' },
  'trade-open': { icon: CheckCircle, leftBorder: 'border-l-slate-400' },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const isMobile = useIsMobile();
  const tc = useTranslations('common');
  const tTerm = useTranslations('terminal');

  return (
    <div
      className={
        isMobile
          ? 'fixed left-3 z-[9999] flex flex-col gap-1.5 pointer-events-none w-[220px]'
          : 'fixed bottom-14 left-[6.5rem] z-[9999] flex flex-col gap-2 pointer-events-none w-full max-w-[260px]'
      }
      style={isMobile ? { bottom: 'calc(var(--mobile-trade-bar-h, 220px) + 36px + 20px)' } : undefined}
      aria-live="polite"
      aria-label={tc('notifications')}
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => useToastStore.getState().dismiss(t.id)}
          compact={isMobile}
          tradeOpenedLabel={tTerm('toast_trade_opened')}
          closeLabel={tc('close')}
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
  compact = false,
  tradeOpenedLabel,
  closeLabel,
}: {
  toast: import('@/stores/toast.store').Toast;
  onDismiss: () => void;
  compact?: boolean;
  tradeOpenedLabel: string;
  closeLabel: string;
}) {
  const config = typeConfig[toast.type];
  const Icon = config.icon;
  const isTradeOpen = toast.type === 'trade-open' && toast.tradeOpen;

  if (isTradeOpen && toast.tradeOpen) {
    const { instrument, direction, amount } = toast.tradeOpen;
    const DirIcon = direction === 'CALL' ? TrendUp : TrendDown;
    const amountStr = amount ? `$${amount}` : '';
    const isCall = direction === 'CALL';
    const leftBorder = isCall ? 'border-l-[#45b833]' : 'border-l-[#ff3d1f]';
    const accentColor = isCall ? '#45b833' : '#ff3d1f';

    return (
      <div
        className={`pointer-events-auto rounded-xl border-l-4 shadow-lg bg-[#0d1626]/90 backdrop-blur-md ${leftBorder} animate-in slide-in-from-bottom-2 fade-in duration-200 ${compact ? 'pl-2.5 pr-2 py-2' : 'pl-3 pr-2.5 py-3'}`}
        role="alert"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className={`flex items-center gap-1.5 font-medium text-white/60 uppercase tracking-wide ${compact ? 'text-[10px]' : 'text-xs'}`}>
            <CheckCircle className={`shrink-0 ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} style={{ color: accentColor }} />
            {tradeOpenedLabel}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded p-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={closeLabel}
          >
            <X className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
          </button>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <p className={`font-semibold text-white ${compact ? 'text-xs' : 'text-sm'}`}>
            {formatInstrument(instrument)}
          </p>
          <span className={`text-white/95 flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            {amountStr}
            <DirIcon className={`shrink-0 ${compact ? 'h-3 w-3' : 'h-4 w-4'}`} style={{ color: accentColor }} aria-hidden />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2 rounded-xl border-l-4 shadow-lg bg-[#0d1626]/90 backdrop-blur-md ${config.leftBorder} animate-in slide-in-from-bottom-2 fade-in duration-200 ${compact ? 'min-h-[36px] pl-2.5 pr-2 py-2' : 'min-h-[48px] pl-3 pr-2.5 py-3'}`}
      role="alert"
    >
      <Icon className={`shrink-0 text-white/90 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
      <p className={`flex-1 font-medium text-white/95 leading-snug truncate ${compact ? 'text-xs' : 'text-sm'}`} title={toast.message}>
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={closeLabel}
      >
        <X className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>
    </div>
  );
}

/** Hook for components that need to show toasts */
export function useToast() {
  return useToastStore((s) => ({ toast: s.toast, dismiss: s.dismiss }));
}
