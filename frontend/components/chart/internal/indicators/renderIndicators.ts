/**
 * renderIndicators.ts - отрисовка индикаторов
 * 
 * FLOW G12: Indicator rendering
 */

import type { IndicatorSeries, IndicatorConfig } from './indicator.types';
import type { Viewport } from '../viewport.types';
import { timeToX, priceToY } from '../utils/coords';

interface RenderIndicatorsParams {
  ctx: CanvasRenderingContext2D;
  indicators: IndicatorSeries[];
  indicatorConfigs: IndicatorConfig[]; // Конфигурация для получения цветов
  viewport: Viewport;
  width: number;
  height: number;
  rsiHeight?: number; // Высота зоны RSI (по умолчанию 0, если RSI не нужен)
  stochHeight?: number; // Высота зоны Stochastic (по умолчанию 0)
  momentumHeight?: number; // Высота зоны Momentum (гистограмма, по умолчанию 0)
  awesomeOscillatorHeight?: number; // Высота зоны Awesome Oscillator (гистограмма, по умолчанию 0)
  macdHeight?: number; // Высота зоны MACD (линия + сигнал + гистограмма, по умолчанию 0)
  atrHeight?: number; // Высота зоны ATR (линия волатильности, по умолчанию 0)
  adxHeight?: number; // Высота зоны ADX (+DI/-DI/ADX, 0-100), по умолчанию 0
}

const RSI_ZONE_HEIGHT = 120; // Высота зоны RSI
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
const RSI_MID = 50; // средняя линия между 30 и 70
const STOCH_OVERBOUGHT = 80;
const STOCH_OVERSOLD = 20;
/** Отступ по вертикали для линий %K/%D, чтобы не упирались в границы зоны (px) */
const STOCH_OSC_PADDING = 10;
const LINE_WIDTH = 1.5;

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || hex.length < 4) return `rgba(0,0,0,${alpha})`;
  let r: number, g: number, b: number;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }
  if (!Number.isFinite(r)) r = 0;
  if (!Number.isFinite(g)) g = 0;
  if (!Number.isFinite(b)) b = 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Конвертирует RSI значение в Y координату (для зоны RSI)
 */
function rsiToY(rsi: number, rsiHeight: number): number {
  // RSI в диапазоне 0-100
  return rsiHeight - (rsi / 100) * rsiHeight;
}

/**
 * Конвертирует значение осциллятора 0-100 в Y (для зоны Stochastic)
 */
function oscToY(value: number, zoneHeight: number): number {
  return zoneHeight - (value / 100) * zoneHeight;
}

/**
 * То же с отступом: линия не доходит до верхней/нижней границы зоны (для стохастика)
 */
function oscToYWithPadding(value: number, zoneHeight: number, padding: number): number {
  const inner = zoneHeight - 2 * padding;
  return padding + (1 - value / 100) * inner;
}

/**
 * Рисует линию индикатора (SMA/EMA/Bollinger)
 */
function renderIndicatorLine(
  ctx: CanvasRenderingContext2D,
  points: Array<{ time: number; value: number }>,
  viewport: Viewport,
  width: number,
  height: number,
  color: string,
  isRSI: boolean = false,
  rsiHeight: number = 0,
  opacity: number = 0.7,
  oscPadding: number = 0
): void {
  if (points.length === 0) return;

  // Фильтруем точки, видимые в viewport
  const visiblePoints = points.filter(p => 
    p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );

  if (visiblePoints.length === 0) return;

  ctx.save();
  ctx.strokeStyle = hexToRgba(color, opacity);
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  let started = false;

  for (let i = 0; i < visiblePoints.length; i++) {
    const point = visiblePoints[i];
    if (!Number.isFinite(point.value)) continue;
    const x = timeToX(point.time, viewport, width);

    let y: number;
    if (isRSI) {
      y = oscPadding > 0
        ? oscToYWithPadding(point.value, rsiHeight, oscPadding)
        : rsiToY(point.value, rsiHeight);
    } else {
      y = priceToY(point.value, viewport, height);
    }

    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Рисует RSI зону с уровнями
 */
function renderRSIZone(
  ctx: CanvasRenderingContext2D,
  rsiSeries: IndicatorSeries,
  indicatorConfigs: IndicatorConfig[],
  viewport: Viewport,
  width: number,
  rsiHeight: number,
  mainHeight: number
): void {
  const yOffset = mainHeight; // RSI зона начинается после основного графика

  ctx.save();

  // Фон зоны RSI
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, rsiHeight);

  // Уровни 30, 50 и 70
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  // Уровень 70 (overbought) - пунктир
  const y70 = yOffset + rsiToY(RSI_OVERBOUGHT, rsiHeight);
  ctx.beginPath();
  ctx.moveTo(0, y70);
  ctx.lineTo(width, y70);
  ctx.stroke();

  // Уровень 30 (oversold) - пунктир
  const y30 = yOffset + rsiToY(RSI_OVERSOLD, rsiHeight);
  ctx.beginPath();
  ctx.moveTo(0, y30);
  ctx.lineTo(width, y30);
  ctx.stroke();

  // Уровень 50 (середина) - сплошная линия
  ctx.setLineDash([]);
  const y50 = yOffset + rsiToY(RSI_MID, rsiHeight);
  ctx.beginPath();
  ctx.moveTo(0, y50);
  ctx.lineTo(width, y50);
  ctx.stroke();

  // Рисуем RSI линию
  const config = indicatorConfigs.find(c => c.id === rsiSeries.id);
  const color = config?.color || '#f97316';
  
  // Создаём локальный viewport для RSI (0-100)
  const rsiViewport: Viewport = {
    timeStart: viewport.timeStart,
    timeEnd: viewport.timeEnd,
    priceMin: 0,
    priceMax: 100,
    yMode: 'manual',
  };

  ctx.translate(0, yOffset);
  renderIndicatorLine(ctx, rsiSeries.points, rsiViewport, width, rsiHeight, color, true, rsiHeight);
  ctx.translate(0, -yOffset);

  ctx.restore();
}

/**
 * Рисует зону Stochastic (%K, %D) с уровнями 20 и 80
 */
function renderStochasticZone(
  ctx: CanvasRenderingContext2D,
  kSeries: IndicatorSeries,
  dSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  stochHeight: number,
  yOffset: number
): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, stochHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  const y80 = yOffset + oscToY(STOCH_OVERBOUGHT, stochHeight);
  ctx.beginPath();
  ctx.moveTo(0, y80);
  ctx.lineTo(width, y80);
  ctx.stroke();

  const y20 = yOffset + oscToY(STOCH_OVERSOLD, stochHeight);
  ctx.beginPath();
  ctx.moveTo(0, y20);
  ctx.lineTo(width, y20);
  ctx.stroke();

  ctx.setLineDash([]);

  const stochViewport: Viewport = {
    timeStart: viewport.timeStart,
    timeEnd: viewport.timeEnd,
    priceMin: 0,
    priceMax: 100,
    yMode: 'manual',
  };

  ctx.translate(0, yOffset);
  renderIndicatorLine(ctx, kSeries.points, stochViewport, width, stochHeight, config.color, true, stochHeight, 0.7, STOCH_OSC_PADDING);
  renderIndicatorLine(ctx, dSeries.points, stochViewport, width, stochHeight, config.colorD ?? '#c084fc', true, stochHeight, 0.7, STOCH_OSC_PADDING);
  ctx.translate(0, -yOffset);

  ctx.restore();
}

const MOMENTUM_GREEN = '#22c55e';
const MOMENTUM_RED = '#ef4444';
/** Доля половины высоты, которую занимают столбцы - чтобы не вылезали за край (0.65 = 65%) */
const MOMENTUM_HEIGHT_RATIO = 0.65;
/** Доля ширины слота на одну свечу - тонкий столбик «1 свеча = 1 бар» */
const MOMENTUM_BAR_WIDTH_RATIO = 0.6;
/** Минимальный зазор между столбцами (px), чтобы при любом зуме не слипались */
const MOMENTUM_MIN_GAP = 1;

/**
 * Рисует зону Momentum: гистограмма с нулевой линией по центру, зелёные вверх, красные вниз.
 * Один столбец на одну свечу; высота ограничена, чтобы не вылезала.
 */
function renderMomentumZone(
  ctx: CanvasRenderingContext2D,
  series: IndicatorSeries,
  viewport: Viewport,
  width: number,
  zoneHeight: number,
  yOffset: number
): void {
  const visiblePoints = series.points.filter(
    (p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );
  if (visiblePoints.length === 0) return;

  const centerY = zoneHeight / 2;
  const valuesAbs = visiblePoints.map((p) => Math.abs(p.value));
  const sorted = [...valuesAbs].sort((a, b) => a - b);
  const p90Index = Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1);
  const scaleRaw = sorted.length > 0 ? sorted[p90Index] : 1;
  const scale = scaleRaw < 1e-12 ? 1 : scaleRaw;
  const halfRange = centerY * MOMENTUM_HEIGHT_RATIO;

  function valueToY(v: number): number {
    return centerY - (v / scale) * halfRange;
  }

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, zoneHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yOffset + centerY);
  ctx.lineTo(width, yOffset + centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(0, yOffset);

  const timeRange = viewport.timeEnd - viewport.timeStart || 1;
  const n = visiblePoints.length;
  const slotWidth = width / n;
  const defaultBarWidth = Math.max(2, slotWidth * MOMENTUM_BAR_WIDTH_RATIO);

  for (let i = 0; i < n; i++) {
    const point = visiblePoints[i];
    const x = ((point.time - viewport.timeStart) / timeRange) * width;
    const nextX = i < n - 1
      ? ((visiblePoints[i + 1].time - viewport.timeStart) / timeRange) * width
      : x + slotWidth;
    const gapToNext = nextX - x;
    const barWidth = Math.max(1, Math.min(defaultBarWidth, gapToNext - MOMENTUM_MIN_GAP));
    const left = x - barWidth / 2;
    const y = valueToY(point.value);

    if (point.value >= 0) {
      ctx.fillStyle = MOMENTUM_GREEN;
      ctx.fillRect(left, y, barWidth, centerY - y);
    } else {
      ctx.fillStyle = MOMENTUM_RED;
      ctx.fillRect(left, centerY, barWidth, y - centerY);
    }
  }

  ctx.translate(0, -yOffset);
  ctx.restore();
}

/** Вертикальный отступ в зоне MACD, чтобы линии не упирались в границы */
const MACD_OSC_PADDING = 12;
/** Доля внутренней высоты для масштаба линий (остальное - отступы) */
const MACD_HEIGHT_RATIO = 0.65;
/** Столбики гистограммы визуально выше: меньший масштаб = выше столбики */
const MACD_BAR_SCALE = 0.82;
const MACD_BAR_WIDTH_RATIO = 0.6;
const MACD_MIN_GAP = 1;

/**
 * Рисует зону MACD: гистограмма (зелёная/красная) + нулевая линия + линия MACD + сигнальная линия.
 * Линии и столбики не доходят до верхней/нижней границы зоны (MACD_OSC_PADDING).
 * Столбики рисуются чуть выше (более выражено) за счёт MACD_BAR_SCALE.
 */
function renderMACDZone(
  ctx: CanvasRenderingContext2D,
  macdSeries: IndicatorSeries,
  signalSeries: IndicatorSeries,
  histogramSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  zoneHeight: number,
  yOffset: number
): void {
  const histPoints = histogramSeries.points.filter(
    (p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );
  if (histPoints.length === 0) return;

  const centerY = zoneHeight / 2;
  const padding = MACD_OSC_PADDING;
  const innerHalfRange = (zoneHeight - 2 * padding) * 0.5 * MACD_HEIGHT_RATIO;

  const allValues = [
    ...histPoints.map((p) => p.value),
    ...macdSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd).map((p) => p.value),
    ...signalSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd).map((p) => p.value),
  ];
  const valuesAbs = allValues.map((v) => Math.abs(v));
  const sorted = [...valuesAbs].sort((a, b) => a - b);
  const p90Index = Math.min(Math.floor(sorted.length * 0.9), sorted.length - 1);
  const scaleRaw = sorted.length > 0 ? sorted[p90Index] : 1;
  const scale = scaleRaw < 1e-12 ? 1 : scaleRaw;

  /** Y для линий MACD/Signal - с отступом от границ */
  function valueToY(v: number): number {
    return centerY - (v / scale) * innerHalfRange;
  }

  /** Y для столбиков гистограммы - те же отступы, но масштаб меньше, столбики визуально выше */
  const scaleBar = scale * MACD_BAR_SCALE;
  function valueToYBar(v: number): number {
    return centerY - (v / scaleBar) * innerHalfRange;
  }

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, zoneHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, yOffset + centerY);
  ctx.lineTo(width, yOffset + centerY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(0, yOffset);

  const timeRange = viewport.timeEnd - viewport.timeStart || 1;

  // Гистограмма (столбики чуть выше за счёт valueToYBar)
  const n = histPoints.length;
  const slotWidth = width / n;
  const defaultBarWidth = Math.max(2, slotWidth * MACD_BAR_WIDTH_RATIO);
  for (let i = 0; i < n; i++) {
    const point = histPoints[i];
    const x = ((point.time - viewport.timeStart) / timeRange) * width;
    const nextX = i < n - 1
      ? ((histPoints[i + 1].time - viewport.timeStart) / timeRange) * width
      : x + slotWidth;
    const gapToNext = nextX - x;
    const barWidth = Math.max(1, Math.min(defaultBarWidth, gapToNext - MACD_MIN_GAP));
    const left = x - barWidth / 2;
    const yBar = valueToYBar(point.value);
    if (point.value >= 0) {
      ctx.fillStyle = MOMENTUM_GREEN;
      ctx.fillRect(left, yBar, barWidth, centerY - yBar);
    } else {
      ctx.fillStyle = MOMENTUM_RED;
      ctx.fillRect(left, centerY, barWidth, yBar - centerY);
    }
  }

  // Линии MACD и Signal (с отступом от границ - valueToY)
  const macdPoints = macdSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const signalPoints = signalSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (macdPoints.length > 0) {
    ctx.strokeStyle = config.color;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    const x0 = ((macdPoints[0].time - viewport.timeStart) / timeRange) * width;
    const y0 = valueToY(macdPoints[0].value);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < macdPoints.length; i++) {
      const x = ((macdPoints[i].time - viewport.timeStart) / timeRange) * width;
      const y = valueToY(macdPoints[i].value);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  if (signalPoints.length > 0) {
    ctx.strokeStyle = config.colorD ?? '#f97316';
    ctx.beginPath();
    const x0 = ((signalPoints[0].time - viewport.timeStart) / timeRange) * width;
    const y0 = valueToY(signalPoints[0].value);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < signalPoints.length; i++) {
      const x = ((signalPoints[i].time - viewport.timeStart) / timeRange) * width;
      const y = valueToY(signalPoints[i].value);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.translate(0, -yOffset);
  ctx.restore();
}

/**
 * Рисует Bollinger Bands на основном графике: заливка между upper/lower + 3 линии
 */
function renderBollingerBands(
  ctx: CanvasRenderingContext2D,
  upperSeries: IndicatorSeries,
  middleSeries: IndicatorSeries,
  lowerSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  height: number
): void {
  const upper = upperSeries.points.filter(p => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const lower = lowerSeries.points.filter(p => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  if (upper.length === 0 || lower.length === 0) return;

  const color = config.color;

  ctx.save();

  // Заливка между upper и lower
  ctx.beginPath();
  for (let i = 0; i < upper.length; i++) {
    const u = upper[i];
    const l = lower[i];
    const x = timeToX(u.time, viewport, width);
    const yU = priceToY(u.value, viewport, height);
    const yL = priceToY(l.value, viewport, height);
    if (i === 0) ctx.moveTo(x, yU);
    else ctx.lineTo(x, yU);
  }
  for (let i = upper.length - 1; i >= 0; i--) {
    const l = lower[i];
    const x = timeToX(l.time, viewport, width);
    const yL = priceToY(l.value, viewport, height);
    ctx.lineTo(x, yL);
  }
  ctx.closePath();
  ctx.fillStyle = hexToRgba(color, 0.08);
  ctx.fill();

  // Линии: upper/lower - полупрозрачные, middle - ярче
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  renderIndicatorLine(ctx, upperSeries.points, viewport, width, height, color, false, 0, 0.5);
  renderIndicatorLine(ctx, middleSeries.points, viewport, width, height, color, false, 0, 0.9);
  renderIndicatorLine(ctx, lowerSeries.points, viewport, width, height, color, false, 0, 0.5);

  ctx.restore();
}

/** Отступ по вертикали в зоне ADX */
const ADX_OSC_PADDING = 10;

/**
 * Рисует зону ADX: три линии ADX, +DI, -DI. Масштаб по видимому min..max для большей чувствительности.
 */
function renderADXZone(
  ctx: CanvasRenderingContext2D,
  adxSeries: IndicatorSeries,
  plusDISeries: IndicatorSeries,
  minusDISeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  zoneHeight: number,
  yOffset: number
): void {
  const adxVis = adxSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const plusVis = plusDISeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const minusVis = minusDISeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  if (adxVis.length === 0) return;

  const allValues = [...adxVis.map((p) => p.value), ...plusVis.map((p) => p.value), ...minusVis.map((p) => p.value)];
  let minVal = allValues[0];
  let maxVal = allValues[0];
  for (let i = 1; i < allValues.length; i++) {
    if (allValues[i] < minVal) minVal = allValues[i];
    if (allValues[i] > maxVal) maxVal = allValues[i];
  }
  const range = maxVal - minVal || 1;
  const pad = range * 0.08;
  const priceMin = minVal - pad;
  const priceMax = maxVal + pad;

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, zoneHeight);

  const adxViewport: Viewport = {
    timeStart: viewport.timeStart,
    timeEnd: viewport.timeEnd,
    priceMin,
    priceMax,
    yMode: 'manual',
  };

  ctx.translate(0, yOffset);
  // isRSI: false - используем priceMin/priceMax из viewport (динамический масштаб), иначе была бы фиксированная 0-100
  renderIndicatorLine(ctx, adxSeries.points, adxViewport, width, zoneHeight, config.color, false, 0, 0.9);
  renderIndicatorLine(ctx, plusDISeries.points, adxViewport, width, zoneHeight, config.colorD ?? '#22c55e', false, 0, 0.65);
  renderIndicatorLine(ctx, minusDISeries.points, adxViewport, width, zoneHeight, '#ef4444', false, 0, 0.65);
  ctx.translate(0, -yOffset);

  ctx.restore();
}

/** Отступ по вертикали в зоне ATR */
const ATR_OSC_PADDING = 8;
/** Доля высоты зоны для линии ATR - не до краёв, чуть отступ */
const ATR_HEIGHT_RATIO = 0.78;

/**
 * Рисует зону ATR: линия волатильности. Масштаб по видимому min..max, чтобы колебания были заметны.
 */
function renderATRZone(
  ctx: CanvasRenderingContext2D,
  series: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  zoneHeight: number,
  yOffset: number
): void {
  const visiblePoints = series.points.filter(
    (p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd
  );
  if (visiblePoints.length === 0) return;

  const padding = ATR_OSC_PADDING;
  const innerHeight = zoneHeight - 2 * padding;
  const values = visiblePoints.map((p) => p.value);
  let minVal = values[0];
  let maxVal = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] < minVal) minVal = values[i];
    if (values[i] > maxVal) maxVal = values[i];
  }
  const range = maxVal - minVal || 1e-12;

  function valueToY(v: number): number {
    const t = (v - minVal) / range;
    return zoneHeight - padding - t * innerHeight * ATR_HEIGHT_RATIO;
  }

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, yOffset, width, zoneHeight);

  ctx.translate(0, yOffset);

  ctx.strokeStyle = config.color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  const timeRange = viewport.timeEnd - viewport.timeStart || 1;
  const x0 = ((visiblePoints[0].time - viewport.timeStart) / timeRange) * width;
  const y0 = valueToY(visiblePoints[0].value);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < visiblePoints.length; i++) {
    const x = ((visiblePoints[i].time - viewport.timeStart) / timeRange) * width;
    const y = valueToY(visiblePoints[i].value);
    ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.translate(0, -yOffset);
  ctx.restore();
}

const ICHIMOKU_CLOUD_UP = 'rgba(34, 197, 94, 0.07)';
const ICHIMOKU_CLOUD_DOWN = 'rgba(239, 68, 68, 0.07)';

/**
 * Рисует Ишимоку на основном графике: облако (Senkou A/B) + пять линий.
 */
function renderIchimoku(
  ctx: CanvasRenderingContext2D,
  tenkanSeries: IndicatorSeries,
  kijunSeries: IndicatorSeries,
  senkouASeries: IndicatorSeries,
  senkouBSeries: IndicatorSeries,
  chikouSeries: IndicatorSeries,
  config: IndicatorConfig,
  viewport: Viewport,
  width: number,
  height: number
): void {
  const senkouA = senkouASeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  const senkouB = senkouBSeries.points.filter((p) => p.time >= viewport.timeStart && p.time <= viewport.timeEnd);
  if (senkouA.length === 0 || senkouB.length === 0) return;

  ctx.save();

  // Облако: заливка между Senkou A и B (зелёная когда A > B, красная когда B > A)
  ctx.beginPath();
  for (let i = 0; i < senkouA.length; i++) {
    const a = senkouA[i];
    const b = senkouB[i];
    if (!b) continue;
    const x = timeToX(a.time, viewport, width);
    const yA = priceToY(a.value, viewport, height);
    const yB = priceToY(b.value, viewport, height);
    if (i === 0) ctx.moveTo(x, yA);
    else ctx.lineTo(x, yA);
  }
  for (let i = senkouA.length - 1; i >= 0; i--) {
    const b = senkouB[i];
    if (!b) continue;
    const x = timeToX(senkouA[i].time, viewport, width);
    const yB = priceToY(b.value, viewport, height);
    ctx.lineTo(x, yB);
  }
  ctx.closePath();
  const mid = Math.floor(senkouA.length / 2);
  ctx.fillStyle = mid < senkouB.length && senkouA[mid].value >= senkouB[mid].value ? ICHIMOKU_CLOUD_UP : ICHIMOKU_CLOUD_DOWN;
  ctx.fill();

  // Линии: все чуть прозрачнее, чтобы не перебивать график
  ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  renderIndicatorLine(ctx, senkouASeries.points, viewport, width, height, config.color, false, 0, 0.22);
  renderIndicatorLine(ctx, senkouBSeries.points, viewport, width, height, config.colorD ?? config.color, false, 0, 0.22);
  renderIndicatorLine(ctx, tenkanSeries.points, viewport, width, height, config.color, false, 0, 0.7);
  renderIndicatorLine(ctx, kijunSeries.points, viewport, width, height, config.colorD ?? '#2563eb', false, 0, 0.7);
  renderIndicatorLine(ctx, chikouSeries.points, viewport, width, height, config.color, false, 0, 0.5);

  ctx.restore();
}

export function renderIndicators({
  ctx,
  indicators,
  indicatorConfigs,
  viewport,
  width,
  height,
  rsiHeight = 0,
  stochHeight = 0,
  momentumHeight = 0,
  awesomeOscillatorHeight = 0,
  macdHeight = 0,
  atrHeight = 0,
  adxHeight = 0,
}: RenderIndicatorsParams): void {
  if (indicators.length === 0) return;

  // Тонкий разделитель между основной областью графика и нижними индикаторными зонами
  const hasBottomZones =
    rsiHeight > 0 ||
    stochHeight > 0 ||
    momentumHeight > 0 ||
    awesomeOscillatorHeight > 0 ||
    macdHeight > 0 ||
    atrHeight > 0 ||
    adxHeight > 0;

  if (hasBottomZones) {
    const bottomOffset =
      rsiHeight +
      stochHeight +
      momentumHeight +
      awesomeOscillatorHeight +
      macdHeight +
      atrHeight +
      adxHeight;

    ctx.save();
    ctx.strokeStyle = '#202a3b';
    ctx.lineWidth = 1;
    const topY = height + 0.5; // верхняя граница индикаторных панелей
    const bottomY = height + bottomOffset + 0.5; // нижняя граница всего блока индикаторов

    // Линия между графиком и индикаторами
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(width, topY);
    ctx.stroke();

    // Линия под всем блоком индикаторов
    ctx.beginPath();
    ctx.moveTo(0, bottomY);
    ctx.lineTo(width, bottomY);
    ctx.stroke();
    ctx.restore();
  }

  // Разделяем индикаторы на SMA/EMA, Bollinger Bands, Keltner, RSI, Stochastic, Momentum, Awesome Oscillator, ATR, ADX и MACD
  const lineIndicators = indicators.filter(i => i.type === 'SMA' || i.type === 'EMA');
  const rsiIndicators = indicators.filter(i => i.type === 'RSI');
  const stochConfigs = indicatorConfigs.filter(c => c.type === 'Stochastic' && c.enabled);
  const momentumIndicators = indicators.filter(i => i.type === 'Momentum');
  const awesomeOscillatorIndicators = indicators.filter(i => i.type === 'AwesomeOscillator');
  const atrIndicators = indicators.filter(i => i.type === 'ATR');
  const adxConfigs = indicatorConfigs.filter(c => c.type === 'ADX' && c.enabled);
  const macdConfigs = indicatorConfigs.filter(c => c.type === 'MACD' && c.enabled);
  const bbConfigs = indicatorConfigs.filter(c => c.type === 'BollingerBands' && c.enabled);
  const keltnerConfigs = indicatorConfigs.filter(c => c.type === 'KeltnerChannels' && c.enabled);
  const ichimokuConfigs = indicatorConfigs.filter(c => c.type === 'Ichimoku' && c.enabled);

  // Рисуем SMA/EMA линии поверх свечей (в основной зоне)
  for (const series of lineIndicators) {
    const config = indicatorConfigs.find(c => c.id === series.id);
    if (!config) continue;

    renderIndicatorLine(
      ctx,
      series.points,
      viewport,
      width,
      height,
      config.color
    );
  }

  // Рисуем Bollinger Bands: заливка между полосами + 3 линии (upper, middle, lower)
  for (const config of bbConfigs) {
    const upperSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_upper');
    const middleSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_middle');
    const lowerSeries = indicators.find(i => i.type === 'BollingerBands' && i.id === config.id + '_lower');
    if (upperSeries && middleSeries && lowerSeries) {
      renderBollingerBands(ctx, upperSeries, middleSeries, lowerSeries, config, viewport, width, height);
    }
  }

  // Рисуем каналы Кельтнера: заливка между полосами + 3 линии (как Bollinger)
  for (const config of keltnerConfigs) {
    const upperSeries = indicators.find(i => i.type === 'KeltnerChannels' && i.id === config.id + '_upper');
    const middleSeries = indicators.find(i => i.type === 'KeltnerChannels' && i.id === config.id + '_middle');
    const lowerSeries = indicators.find(i => i.type === 'KeltnerChannels' && i.id === config.id + '_lower');
    if (upperSeries && middleSeries && lowerSeries) {
      renderBollingerBands(ctx, upperSeries, middleSeries, lowerSeries, config, viewport, width, height);
    }
  }

  // Рисуем Ишимоку: облако + Tenkan, Kijun, Senkou A/B, Chikou
  for (const config of ichimokuConfigs) {
    const tenkan = indicators.find(i => i.type === 'Ichimoku' && i.id === config.id + '_tenkan');
    const kijun = indicators.find(i => i.type === 'Ichimoku' && i.id === config.id + '_kijun');
    const senkouA = indicators.find(i => i.type === 'Ichimoku' && i.id === config.id + '_senkouA');
    const senkouB = indicators.find(i => i.type === 'Ichimoku' && i.id === config.id + '_senkouB');
    const chikou = indicators.find(i => i.type === 'Ichimoku' && i.id === config.id + '_chikou');
    if (tenkan && kijun && senkouA && senkouB && chikou) {
      renderIchimoku(ctx, tenkan, kijun, senkouA, senkouB, chikou, config, viewport, width, height);
    }
  }

  // Рисуем RSI зону (если есть RSI индикаторы)
  if (rsiHeight > 0) {
    for (const rsiSeries of rsiIndicators) {
      renderRSIZone(ctx, rsiSeries, indicatorConfigs, viewport, width, rsiHeight, height);
    }
  }

  // Рисуем Stochastic зону (%K, %D) под RSI
  if (stochHeight > 0) {
    const stochYOffset = height + rsiHeight;
    for (const config of stochConfigs) {
      const kSeries = indicators.find(i => i.type === 'Stochastic' && i.id === config.id + '_k');
      const dSeries = indicators.find(i => i.type === 'Stochastic' && i.id === config.id + '_d');
      if (kSeries && dSeries) {
        renderStochasticZone(ctx, kSeries, dSeries, config, viewport, width, stochHeight, stochYOffset);
      }
    }
  }

  // Рисуем Momentum зону (гистограмма) под Stochastic
  if (momentumHeight > 0) {
    const momentumYOffset = height + rsiHeight + stochHeight;
    for (const series of momentumIndicators) {
      renderMomentumZone(ctx, series, viewport, width, momentumHeight, momentumYOffset);
    }
  }

  // Рисуем Awesome Oscillator зону (гистограмма) под Momentum
  if (awesomeOscillatorHeight > 0) {
    const aoYOffset = height + rsiHeight + stochHeight + momentumHeight;
    for (const series of awesomeOscillatorIndicators) {
      renderMomentumZone(ctx, series, viewport, width, awesomeOscillatorHeight, aoYOffset);
    }
  }

  // Рисуем MACD зону (гистограмма + линии MACD и Signal) под Awesome Oscillator
  if (macdHeight > 0) {
    const macdYOffset = height + rsiHeight + stochHeight + momentumHeight + awesomeOscillatorHeight;
    for (const config of macdConfigs) {
      const macdSeries = indicators.find(i => i.type === 'MACD' && i.id === config.id + '_macd');
      const signalSeries = indicators.find(i => i.type === 'MACD' && i.id === config.id + '_signal');
      const histogramSeries = indicators.find(i => i.type === 'MACD' && i.id === config.id + '_histogram');
      if (macdSeries && signalSeries && histogramSeries) {
        renderMACDZone(ctx, macdSeries, signalSeries, histogramSeries, config, viewport, width, macdHeight, macdYOffset);
      }
    }
  }

  // Рисуем ATR зону (линия волатильности) под MACD
  if (atrHeight > 0) {
    const atrYOffset = height + rsiHeight + stochHeight + momentumHeight + awesomeOscillatorHeight + macdHeight;
    for (const series of atrIndicators) {
      const config = indicatorConfigs.find(c => c.id === series.id);
      if (config) renderATRZone(ctx, series, config, viewport, width, atrHeight, atrYOffset);
    }
  }

  // Рисуем ADX зону (ADX, +DI, -DI, 0-100) под ATR
  if (adxHeight > 0) {
    const adxYOffset = height + rsiHeight + stochHeight + momentumHeight + awesomeOscillatorHeight + macdHeight + atrHeight;
    for (const config of adxConfigs) {
      const adxSeries = indicators.find(i => i.type === 'ADX' && i.id === config.id + '_adx');
      const plusDI = indicators.find(i => i.type === 'ADX' && i.id === config.id + '_plusDI');
      const minusDI = indicators.find(i => i.type === 'ADX' && i.id === config.id + '_minusDI');
      if (adxSeries && plusDI && minusDI) {
        renderADXZone(ctx, adxSeries, plusDI, minusDI, config, viewport, width, adxHeight, adxYOffset);
      }
    }
  }
}
