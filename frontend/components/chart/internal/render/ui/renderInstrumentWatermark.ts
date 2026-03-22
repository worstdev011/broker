/**
 * Render instrument name + timeframe as a semi-transparent watermark in the center of the chart.
 * Similar to TradingView's ticker watermark style.
 * Controlled by chartSettings.showWatermark
 */

import { getChartSettings } from '@/lib/chartSettings';

/**
 * Форматирует instrumentId в читаемый label.
 * Real пары - без суффикса (EUR/USD). OTC пары - с суффиксом "OTC" (EUR/USD OTC).
 */
function formatInstrumentLabel(instrumentId: string): string {
  let id = instrumentId;
  let suffix = '';

  if (id.endsWith('_OTC')) {
    suffix = ' OTC';
    id = id.slice(0, -4);
  } else if (id.endsWith('_REAL')) {
    suffix = ''; // Real - без суффикса (основные рыночные котировки)
    id = id.slice(0, -5);
  }

  // Пытаемся разделить на пары (6 символов = 3+3, например EURUSD → EUR/USD)
  if (id.length === 6 && /^[A-Z]+$/.test(id)) {
    return `${id.slice(0, 3)}/${id.slice(3)}${suffix}`;
  }

  // Крипто-пары (BTCUSD → BTC/USD)
  const quoteCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'BTC', 'ETH', 'USDT'];
  for (const quote of quoteCurrencies) {
    if (id.endsWith(quote) && id.length > quote.length) {
      return `${id.slice(0, -quote.length)}/${quote}${suffix}`;
    }
  }

  return `${id}${suffix}`;
}

/**
 * Форматирует таймфрейм в читаемый вид: "5s" → "5S", "1m" → "1M", "1h" → "1H"
 */
function formatTimeframeLabel(timeframe: string): string {
  return timeframe.toUpperCase();
}

// Кэш настройки чтобы не читать localStorage каждый кадр
let cachedShowWatermark: boolean | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 2000; // Обновляем кэш раз в 2 секунды

function shouldShowWatermark(): boolean {
  const now = Date.now();
  if (cachedShowWatermark === null || now - cacheTimestamp > CACHE_TTL_MS) {
    cachedShowWatermark = getChartSettings().showWatermark;
    cacheTimestamp = now;
  }
  return cachedShowWatermark;
}

export function renderInstrumentWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  instrumentId: string | undefined | null,
  timeframe?: string | null,
): void {
  if (!instrumentId) return;
  if (!shouldShowWatermark()) return;

  const instrumentLabel = formatInstrumentLabel(instrumentId);
  const fontSize = Math.max(28, Math.min(48, width * 0.05));
  const timeframeFontSize = Math.round(fontSize * 0.55);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (timeframe) {
    // Две строки: название пары + таймфрейм
    const gap = fontSize * 0.35;
    const totalHeight = fontSize + gap + timeframeFontSize;
    const topY = height / 2 - totalHeight / 2 + fontSize / 2;

    // Название пары
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(instrumentLabel, width / 2, topY);

    // Таймфрейм (под названием, чуть меньше)
    ctx.font = `500 ${timeframeFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(formatTimeframeLabel(timeframe), width / 2, topY + fontSize / 2 + gap + timeframeFontSize / 2);
  } else {
    // Одна строка: только название пары
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(instrumentLabel, width / 2, height / 2);
  }

  ctx.restore();
}
