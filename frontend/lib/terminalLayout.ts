import type { IndicatorConfig } from '@/components/chart/internal/indicators/indicator.types';
import type { Drawing } from '@/components/chart/internal/drawings/drawing.types';
import { logger } from '@/lib/logger';

type DrawingLayout = {
  id: string;
  type: 'horizontal' | 'vertical' | 'trend' | 'rectangle' | 'fibonacci' | 'parallel-channel' | 'ray' | 'arrow';
  points: { time: number; price: number }[];
  color?: string;
  offset?: number;
};

export type TerminalLayout = {
  instrument?: string;
  timeframe?: string;
  chartType?: 'candles' | 'line';
  candleMode?: 'classic' | 'heikin_ashi' | 'bars';
  indicators?: {
    id: string;
    params: Record<string, any>;
    visible: boolean;
  }[];
  /** @deprecated Use drawingsByInstrument. Kept for v1 migration only. */
  drawings?: DrawingLayout[];
  drawingsByInstrument?: Record<string, DrawingLayout[]>;
  tradeTime?: string;
  tradeAmount?: string;
  soundEnabled?: boolean;
  hideBalance?: boolean;
};

const LAYOUT_KEY_V2 = 'terminal.layout.v2';
const LAYOUT_KEY_V1 = 'terminal.layout.v1';

export function saveLayoutToLocalStorage(layout: TerminalLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY_V2, JSON.stringify(layout));
  } catch (error) {
    logger.error('[TerminalLayout] Failed to save layout:', error);
  }
}

function isValidLayout(parsed: any): parsed is TerminalLayout {
  return (
    parsed &&
    typeof parsed === 'object' &&
    (parsed.instrument === undefined || typeof parsed.instrument === 'string') &&
    (parsed.timeframe === undefined || typeof parsed.timeframe === 'string') &&
    (parsed.indicators === undefined || Array.isArray(parsed.indicators)) &&
    (parsed.chartType === undefined || parsed.chartType === 'candles' || parsed.chartType === 'line') &&
    (parsed.candleMode === undefined || ['classic', 'heikin_ashi', 'bars'].includes(parsed.candleMode))
  );
}

/** Migrate v1 layout: move global `drawings` into `drawingsByInstrument` under the saved instrument key. */
function migrateV1(v1: TerminalLayout): TerminalLayout {
  const { drawings, ...rest } = v1;
  const migrated: TerminalLayout = { ...rest };

  if (drawings && drawings.length > 0) {
    const instrumentKey = v1.instrument || 'EURUSD_OTC';
    migrated.drawingsByInstrument = { [instrumentKey]: drawings };
  }

  delete migrated.drawings;
  return migrated;
}

export function loadLayoutFromLocalStorage(): TerminalLayout | null {
  try {
    // Try v2 first
    const rawV2 = localStorage.getItem(LAYOUT_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (isValidLayout(parsed)) return parsed;
    }

    // Fall back to v1 and migrate
    const rawV1 = localStorage.getItem(LAYOUT_KEY_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      if (isValidLayout(parsed)) {
        const migrated = migrateV1(parsed);
        saveLayoutToLocalStorage(migrated);
        try { localStorage.removeItem(LAYOUT_KEY_V1); } catch { /* ignore */ }
        return migrated;
      }
    }

    return null;
  } catch (error) {
    logger.error('[TerminalLayout] Failed to load layout:', error);
    return null;
  }
}

export function indicatorConfigToLayout(config: any): NonNullable<TerminalLayout['indicators']>[number] {
  const params: Record<string, any> = {
    period: config.period,
  };

  if (config.type === 'Stochastic' && config.periodD !== undefined) {
    params.periodD = config.periodD;
  }

  if (config.type === 'BollingerBands' && config.stdDevMult !== undefined) {
    params.stdDevMult = config.stdDevMult;
  }

  if (config.type === 'MACD') {
    if (config.fastPeriod !== undefined) params.fastPeriod = config.fastPeriod;
    if (config.slowPeriod !== undefined) params.slowPeriod = config.slowPeriod;
    if (config.signalPeriod !== undefined) params.signalPeriod = config.signalPeriod;
  }

  return {
    id: config.id,
    params,
    visible: config.enabled ?? false,
  };
}

export function layoutIndicatorToConfig(
  layoutIndicator: NonNullable<TerminalLayout['indicators']>[number],
  indicatorType: string,
): Partial<IndicatorConfig> {
  const config: Partial<IndicatorConfig> = {
    id: layoutIndicator.id,
    enabled: layoutIndicator.visible,
    period: layoutIndicator.params.period,
  };

  if (indicatorType === 'Stochastic' && layoutIndicator.params.periodD !== undefined) {
    config.periodD = layoutIndicator.params.periodD;
  }

  if (indicatorType === 'BollingerBands' && layoutIndicator.params.stdDevMult !== undefined) {
    config.stdDevMult = layoutIndicator.params.stdDevMult;
  }

  if (indicatorType === 'MACD') {
    const c = config as Record<string, unknown>;
    if (layoutIndicator.params.fastPeriod !== undefined) c.fastPeriod = layoutIndicator.params.fastPeriod;
    if (layoutIndicator.params.slowPeriod !== undefined) c.slowPeriod = layoutIndicator.params.slowPeriod;
    if (layoutIndicator.params.signalPeriod !== undefined) c.signalPeriod = layoutIndicator.params.signalPeriod;
  }

  return config;
}

export function drawingToLayout(drawing: any): DrawingLayout {
  const base = {
    id: drawing.id,
    type: drawing.type,
    color: drawing.color,
  };

  if (drawing.type === 'horizontal') {
    return { ...base, points: [{ time: 0, price: drawing.price }] };
  }

  if (drawing.type === 'vertical') {
    return { ...base, points: [{ time: drawing.time, price: 0 }] };
  }

  if (
    drawing.type === 'trend' ||
    drawing.type === 'rectangle' ||
    drawing.type === 'fibonacci' ||
    drawing.type === 'ray' ||
    drawing.type === 'arrow'
  ) {
    return { ...base, points: [drawing.start, drawing.end] };
  }

  if (drawing.type === 'parallel-channel') {
    return { ...base, points: [drawing.start, drawing.end], offset: drawing.offset };
  }

  return { ...base, points: [] };
}

export function layoutDrawingToDrawing(
  layoutDrawing: DrawingLayout,
): any | null {
  const { id, type, points, color = '#3347ff', offset } = layoutDrawing;

  if (type === 'horizontal' && points.length > 0) {
    return { id, type: 'horizontal', price: points[0].price, color } as Drawing;
  }

  if (type === 'vertical' && points.length > 0) {
    return { id, type: 'vertical', time: points[0].time, color } as Drawing;
  }

  if (
    (type === 'trend' || type === 'rectangle' || type === 'fibonacci' || type === 'ray' || type === 'arrow') &&
    points.length >= 2
  ) {
    return { id, type, start: points[0], end: points[1], color } as Drawing;
  }

  if (type === 'parallel-channel' && points.length >= 2 && offset !== undefined) {
    return { id, type: 'parallel-channel', start: points[0], end: points[1], offset, color } as Drawing;
  }

  return null;
}
