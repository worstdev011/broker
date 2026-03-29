import { create } from 'zustand';

/**
 * Последняя известная цена по инструменту с терминала (WS активного графика).
 * Для карточек открытых сделок в истории: сравнение с entry без лишних запросов.
 */
interface TerminalPriceState {
  byInstrument: Record<string, number>;
  setInstrumentPrice: (instrumentId: string, price: number) => void;
}

export const useTerminalPriceStore = create<TerminalPriceState>((set) => ({
  byInstrument: {},
  setInstrumentPrice: (instrumentId, price) => {
    if (!instrumentId || !Number.isFinite(price) || price <= 0) return;
    set((s) => {
      if (s.byInstrument[instrumentId] === price) return s;
      return { byInstrument: { ...s.byInstrument, [instrumentId]: price } };
    });
  },
}));
