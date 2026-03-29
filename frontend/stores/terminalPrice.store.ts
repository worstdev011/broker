import { create } from 'zustand';

/**
 * Последняя цена по инструменту + счётчик тиков WS (даже при той же цифре),
 * чтобы подписчики могли реагировать на поток котировок, а не только на смену значения.
 */
interface TerminalPriceState {
  byInstrument: Record<string, number>;
  tickRev: Record<string, number>;
  setInstrumentPrice: (instrumentId: string, price: number) => void;
}

export const useTerminalPriceStore = create<TerminalPriceState>((set) => ({
  byInstrument: {},
  tickRev: {},
  setInstrumentPrice: (instrumentId, price) => {
    if (!instrumentId || !Number.isFinite(price) || price <= 0) return;
    set((s) => ({
      byInstrument: { ...s.byInstrument, [instrumentId]: price },
      tickRev: { ...s.tickRev, [instrumentId]: (s.tickRev[instrumentId] ?? 0) + 1 },
    }));
  },
}));
