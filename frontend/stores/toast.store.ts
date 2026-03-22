/**
 * Toast notifications store
 * Replaces window.alert() with non-blocking UI feedback
 */

import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info' | 'warning' | 'trade-open';

export interface TradeOpenPayload {
  instrument: string;
  direction: 'CALL' | 'PUT';
  amount: string;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
  /** Ключ для снятия тоста по нему (например tradeId для "сделка открыта") */
  key?: string;
  /** Не скрывать автоматически - снять только через dismiss/dismissByKey */
  persistent?: boolean;
  /** Для type === 'trade-open': данные для отображения */
  tradeOpen?: TradeOpenPayload;
}

export interface ToastOptions {
  key?: string;
  persistent?: boolean;
  /** Таймаут авто-скрытия (мс); если не задан и не persistent - 4000 */
  duration?: number;
  tradeOpen?: TradeOpenPayload;
}

interface ToastStore {
  toasts: Toast[];
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
  /** Снять тост по ключу (например тост "сделка открыта" по tradeId) */
  dismissByKey: (key: string) => void;
}

let idCounter = 0;
const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  toast: (message: string, type: ToastType = 'info', options?: ToastOptions) => {
    const id = `toast-${++idCounter}-${Date.now()}`;
    const persistent = options?.persistent ?? false;
    const toast: Toast = {
      id,
      message,
      type,
      createdAt: Date.now(),
      key: options?.key,
      persistent,
      tradeOpen: options?.tradeOpen,
    };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (!persistent) {
      const ms = options?.duration ?? AUTO_DISMISS_MS;
      setTimeout(() => {
        get().dismiss(id);
      }, ms);
    }
  },

  dismiss: (id: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  dismissByKey: (key: string) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.key !== key) }));
  },
}));

/** Show toast from outside React (e.g. in callbacks, chart hooks) */
export function toast(message: string, type?: ToastType, options?: ToastOptions): void {
  useToastStore.getState().toast(message, type ?? 'info', options);
}

/** Показать тост «сделка открыта» (пропадает через 3 сек; key = tradeId для снятия при закрытии) */
export function showTradeOpenToast(data: TradeOpenPayload & { id: string }): void {
  useToastStore.getState().toast('Сделка открыта', 'trade-open', {
    key: data.id,
    duration: 3000,
    tradeOpen: { instrument: data.instrument, direction: data.direction, amount: data.amount },
  });
}

/** Показать тост результата сделки (WIN/LOSS/TIE) */
export function showTradeCloseToast(data: {
  result: 'WIN' | 'LOSS' | 'TIE';
  amount: string;
  payout: string;
  direction: 'CALL' | 'PUT';
  instrument: string;
}): void {
  const amt = parseFloat(data.amount);
  const pay = parseFloat(data.payout);
  if (data.result === 'WIN') {
    const profit = amt * pay;
    useToastStore.getState().toast(`+${profit.toFixed(2)} USD`, 'success', { duration: 4000 });
  } else if (data.result === 'LOSS') {
    useToastStore.getState().toast(`-${amt.toFixed(2)} USD`, 'error', { duration: 4000 });
  } else {
    useToastStore.getState().toast(`Ничья: возврат ${amt.toFixed(2)} USD`, 'info', { duration: 4000 });
  }
}

/** Снять тост по ключу (например тост «сделка открыта» по tradeId при закрытии сделки) */
export function dismissToastByKey(key: string): void {
  useToastStore.getState().dismissByKey(key);
}
