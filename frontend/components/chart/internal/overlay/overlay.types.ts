/**
 * FLOW O1/O2 - Overlay Base Model
 * Единый контракт для индикаторов, рисунков и будущих оверлеев.
 * UI не лезет в params и points.
 */

export type OverlayType = 'indicator' | 'drawing' | 'trade';

export type OverlayBase = {
  id: string;
  type: OverlayType;
  name: string;
  visible: boolean;
};

export type IndicatorOverlay = OverlayBase & {
  type: 'indicator';
  indicatorId: string; // 'RSI' | 'EMA' | 'SMA' | 'FractalChaos'
  params: Record<string, unknown>;
};

export type DrawingOverlay = OverlayBase & {
  type: 'drawing';
  drawingType: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';
  points: { time: number; price: number }[];
};

export type TradeOverlay = OverlayBase & {
  type: 'trade';
  tradeId: string;
  direction: 'CALL' | 'PUT';
  entryPrice: number;
  openedAt: number; // timestamp
  expiresAt: number; // timestamp
};

export type Overlay = IndicatorOverlay | DrawingOverlay | TradeOverlay;

export function isIndicatorOverlay(o: Overlay): o is IndicatorOverlay {
  return o.type === 'indicator';
}

export function isDrawingOverlay(o: Overlay): o is DrawingOverlay {
  return o.type === 'drawing';
}

export function isTradeOverlay(o: Overlay): o is TradeOverlay {
  return o.type === 'trade';
}
