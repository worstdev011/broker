/** RAF-based render loop for the candle chart. */

import { useEffect, useRef, RefObject } from 'react';
import { logger } from '@/lib/logger';
import { getChartSettings } from '@/lib/chartSettings';
import { renderCandles, renderCandleMinMaxLabels } from './render/renderCandles';
import { renderPriceLine } from './render/renderPriceLine';
import { renderCrosshair, renderCrosshairTimeLabel } from './crosshair/renderCrosshair';
import { renderOhlcPanel } from './ohlc/renderOhlcPanel';
import { renderIndicators } from './indicators/renderIndicators';
import { renderDrawings } from './drawings/renderDrawings';
import { renderPriceAlerts } from './alerts/renderPriceAlerts';
import { renderTrades } from './trades/renderTrades';
import { renderCountdown } from './countdown/renderCountdown';
import { renderHoverHighlight, type HoverAction } from './render/renderHoverHighlight';
import { renderMarketClosedOverlay, type MarketStatus, type MarketCountdown } from './render/renderMarketOverlay';
import { renderMarketAlternatives } from './render/renderMarketAlternatives';
import { renderGrid } from './render/renderGrid';
import { renderAxes, renderTimeAxisOverlay } from './render/renderAxes';
import { LABEL_FONT } from './chartTheme';
import { renderInstrumentWatermark } from './render/ui/renderInstrumentWatermark';
import { getMarketCountdown } from './utils/marketCountdown';
import type { Viewport } from './viewport.types';
import type { Candle } from './chart.types';
import type { CrosshairState } from './crosshair/crosshair.types';
import type { OhlcData } from './ohlc/ohlc.types';
import type { CandleMode } from './candleModes/candleMode.types';
import type { IndicatorSeries, IndicatorConfig } from './indicators/indicator.types';
import type { Drawing } from './drawings/drawing.types';
import type { PriceAlert } from './alerts/priceAlerts.types';
import type { InteractionZone } from './interactions/interaction.types';

interface UseRenderLoopParams {
  canvasRef: RefObject<HTMLCanvasElement>;
  getViewport: () => Viewport | null;
  getRenderCandles: () => Candle[];
  getRenderLiveCandle: () => Candle | null;
  getAnimatedCandle: () => Candle | null;
  getLiveCandleForRender: (animatedCandle: Candle | null) => Candle | null;
  updateAnimator: (now: number) => void;
  getFollowMode: () => boolean;
  advanceFollowAnimation: (now: number) => void;
  advanceYAnimation: (now: number) => void;
  getTimeframeMs: () => number;
  getCrosshair: () => CrosshairState | null;
  getOhlc: () => OhlcData | null;
  updateOhlc: () => void;
  getMode: () => CandleMode;
  getIndicatorSeries: () => IndicatorSeries[];
  indicatorConfigs: IndicatorConfig[];
  getDrawings: () => Drawing[];
  getHoveredDrawingId: () => string | null;
  getSelectedDrawingId: () => string | null;
  getVisibleOverlayIds?: () => Set<string>;
  getServerTimeText?: () => string;
  getDigits?: () => number | undefined;
  getPriceAlerts: () => PriceAlert[];
  registerInteractionZone: (zone: InteractionZone) => void;
  clearInteractionZones: () => void;
  getExpirationTime?: () => number | null;
  getExpirationSeconds?: () => number;
  getTrades?: () => Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    amount?: number;
  }>;
  getRecentClosedTrades?: () => Array<{
    id: string;
    direction: 'CALL' | 'PUT';
    entryPrice: number;
    openedAt: number;
    expiresAt: number;
    snappedEntryTime?: number;
    amount?: number;
    result: 'WIN' | 'LOSS' | 'TIE';
    pnl: number;
  }>;
  getPayoutPercent?: () => number;
  getTimeframeLabel?: () => string;
  getFormattedCountdown?: () => string;
  getHoverAction?: () => HoverAction;
  getArrowUpImg?: () => HTMLImageElement | null;
  getArrowDownImg?: () => HTMLImageElement | null;
  advancePanInertia?: (now: number) => void;
  getMarketStatus?: () => MarketStatus;
  getNextMarketOpenAt?: () => number | null;
  getServerTimeMs?: () => number;
  getTopAlternatives?: () => Array<{ instrumentId: string; label: string; payout: number }>;
  marketAlternativesHitboxesRef?: React.MutableRefObject<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    instrumentId: string;
  }>>;
  getMarketAlternativesHoveredIndex?: () => number | null;
  instrument?: string;
  timeframe?: string;
}

export function useRenderLoop({
  canvasRef,
  getViewport,
  getRenderCandles,
  getRenderLiveCandle,
  getAnimatedCandle,
  getLiveCandleForRender,
  updateAnimator,
  getFollowMode,
  advanceFollowAnimation,
  advanceYAnimation,
  getTimeframeMs,
  getCrosshair,
  getOhlc,
  updateOhlc,
  getMode,
  getIndicatorSeries,
  indicatorConfigs,
  getDrawings,
  getHoveredDrawingId,
  getSelectedDrawingId,
  getVisibleOverlayIds,
  getServerTimeText,
  getServerTimeMs,
  getDigits,
  getPriceAlerts,
  registerInteractionZone,
  clearInteractionZones,
  getExpirationTime,
  getExpirationSeconds,
  getTrades,
  getRecentClosedTrades,
  getPayoutPercent,
  getTimeframeLabel,
  getFormattedCountdown,
    getHoverAction,
    getArrowUpImg,
    getArrowDownImg,
    advancePanInertia,
    getMarketStatus,
    getNextMarketOpenAt,
    getTopAlternatives,
    marketAlternativesHitboxesRef,
    getMarketAlternativesHoveredIndex,
    instrument,
    timeframe,
}: UseRenderLoopParams): void {
  const rafIdRef = useRef<number | null>(null);
  // Stable ref so RAF loop reads fresh callbacks without restarting useEffect
  const paramsRef = useRef<UseRenderLoopParams>(null!);
  paramsRef.current = {
    canvasRef,
    getViewport,
    getRenderCandles,
    getRenderLiveCandle,
    getAnimatedCandle,
    getLiveCandleForRender,
    updateAnimator,
    getFollowMode,
    advanceFollowAnimation,
    advanceYAnimation,
    getTimeframeMs,
    getCrosshair,
    getOhlc,
    updateOhlc,
    getMode,
    getIndicatorSeries,
    indicatorConfigs,
    getDrawings,
    getHoveredDrawingId,
    getSelectedDrawingId,
    getVisibleOverlayIds,
    getServerTimeText,
    getServerTimeMs,
    getDigits,
    getPriceAlerts,
    registerInteractionZone,
    clearInteractionZones,
    getExpirationTime,
    getExpirationSeconds,
    getTrades,
    getRecentClosedTrades,
    getPayoutPercent,
    getTimeframeLabel,
    getFormattedCountdown,
    getHoverAction,
    getArrowUpImg,
    getArrowDownImg,
    advancePanInertia,
    getMarketStatus,
    getNextMarketOpenAt,
    getTopAlternatives,
    marketAlternativesHitboxesRef,
    getMarketAlternativesHoveredIndex,
    instrument,
    timeframe,
  };

  // Static layer cache: grid + closed candles + axes (redrawn only when viewport/data change)
  const staticCanvasRef = useRef<OffscreenCanvas | null>(null);
  const staticCtxRef = useRef<OffscreenCanvasRenderingContext2D | null>(null);
  const staticKeyRef = useRef<string>('');

  const expirationRenderTimeRef = useRef<number | null>(null);
  const expirationTargetTimeRef = useRef<number | null>(null);
  const expirationAnimStartTimeRef = useRef<number | null>(null);
  const expirationAnimStartValueRef = useRef<number | null>(null);
  // Background image cache
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const backgroundImageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('Failed to get 2d context for render loop');
      return;
    }

    const render = (now: number) => {
      const p = paramsRef.current;
      p.updateAnimator(now);
      if (p.advancePanInertia && !p.getFollowMode()) {
        p.advancePanInertia(now);
      }
      if (p.getFollowMode()) {
        p.advanceFollowAnimation(now);
      }
      p.advanceYAnimation(now);
      p.clearInteractionZones();

      const viewport = p.getViewport();
      
      // Если viewport === null → не рисовать
      if (!viewport) {
        rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
        return;
      }

      const candles = p.getRenderCandles();
      const animatedCandle = p.getAnimatedCandle();
      const liveCandle = p.getLiveCandleForRender(animatedCandle);
      const mode = p.getMode();
      const digits = p.getDigits?.();

      // CSS dimensions (ctx is already DPR-scaled by useCanvasInfrastructure)
      const width = canvas.clientWidth || canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.clientHeight || canvas.height / (window.devicePixelRatio || 1);

      // Skip if canvas has no valid dimensions
      if (width <= 0 || height <= 0) {
        rafIdRef.current = requestAnimationFrame(render);
        return;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Load chart settings once per frame
      const settings = getChartSettings();

      if (settings.backgroundImage) {
        if (backgroundImageUrlRef.current !== settings.backgroundImage) {
          backgroundImageUrlRef.current = settings.backgroundImage;
          backgroundImageRef.current = null;
          const img = new Image();
          img.src = settings.backgroundImage;
          img.onload = () => {
            backgroundImageRef.current = img;
          };
        }
        
        // Draw if loaded
        if (backgroundImageRef.current && backgroundImageRef.current.complete) {
          ctx.save();
          ctx.globalAlpha = settings.backgroundOpacity;
          ctx.drawImage(backgroundImageRef.current, 0, 0, width, height);
          ctx.restore();
        }
      } else {
        backgroundImageRef.current = null;
        backgroundImageUrlRef.current = null;
      }

      // Watermark
      renderInstrumentWatermark(ctx, width, height, p.instrument, p.timeframe);

      const marketStatus = p.getMarketStatus?.() ?? 'OPEN';
      const marketOpen = marketStatus === 'OPEN';

      // Filter by visible overlay IDs
      const visibleIds = p.getVisibleOverlayIds?.();
      const allIndicators = p.getIndicatorSeries();
      const indicators = visibleIds
        ? allIndicators.filter((i) => {
            if (i.type === 'Stochastic') {
              const baseId = i.id.replace(/_k$|_d$/, '');
              return visibleIds.has(baseId);
            }
            if (i.type === 'BollingerBands' || i.type === 'KeltnerChannels') {
              const baseId = i.id.replace(/_upper$|_middle$|_lower$/, '');
              return visibleIds.has(baseId);
            }
            if (i.type === 'MACD') {
              const baseId = i.id.replace(/_macd$|_signal$|_histogram$/, '');
              return visibleIds.has(baseId);
            }
            if (i.type === 'Ichimoku') {
              const baseId = i.id.replace(/_tenkan$|_kijun$|_senkouA$|_senkouB$|_chikou$/, '');
              return visibleIds.has(baseId);
            }
            if (i.type === 'ADX') {
              const baseId = i.id.replace(/_adx$|_plusDI$|_minusDI$/, '');
              return visibleIds.has(baseId);
            }
            return visibleIds.has(i.id);
          })
        : allIndicators;
      const hasRSI = indicators.some((i) => i.type === 'RSI') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'RSI' && c.enabled));
      const hasStochastic = indicators.some((i) => i.type === 'Stochastic') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'Stochastic' && c.enabled));
      const hasMomentum = indicators.some((i) => i.type === 'Momentum') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'Momentum' && c.enabled));
      const hasAwesomeOscillator = indicators.some((i) => i.type === 'AwesomeOscillator') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'AwesomeOscillator' && c.enabled));
      const hasMACD = indicators.some((i) => i.type === 'MACD') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'MACD' && c.enabled));
      const hasATR = indicators.some((i) => i.type === 'ATR') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'ATR' && c.enabled));
      const hasADX = indicators.some((i) => i.type === 'ADX') ||
        (visibleIds == null && p.indicatorConfigs.some((c) => c.type === 'ADX' && c.enabled));
      const rsiHeight = hasRSI ? 120 : 0;
      const stochHeight = hasStochastic ? 120 : 0;
      const momentumHeight = hasMomentum ? 90 : 0;
      const awesomeOscillatorHeight = hasAwesomeOscillator ? 90 : 0;
      const macdHeight = hasMACD ? 100 : 0;
      const atrHeight = hasATR ? 80 : 0;
      const adxHeight = hasADX ? 80 : 0;
      const mainHeight = Math.max(1, height - rsiHeight - stochHeight - momentumHeight - awesomeOscillatorHeight - macdHeight - atrHeight - adxHeight);

      // Market closed: only render grid + axes + overlay
      if (!marketOpen) {
        renderGrid({
          ctx,
          viewport,
          width,
          height: mainHeight,
          timeframeMs: p.getTimeframeMs(),
        });

        renderAxes({
          ctx,
          viewport,
          width,
          height: mainHeight,
          digits,
        });

        let countdown: MarketCountdown | undefined;
        const nextMarketOpenAt = p.getNextMarketOpenAt?.();
        const serverTimeMs = p.getServerTimeMs?.();
        
        if (nextMarketOpenAt && serverTimeMs) {
          countdown = getMarketCountdown(serverTimeMs, nextMarketOpenAt);
        }

        renderMarketClosedOverlay({
          ctx,
          width,
          height: mainHeight,
          status: marketStatus,
          countdown,
        });

        const alternatives = p.getTopAlternatives?.() ?? [];
        if (alternatives.length > 0 && p.marketAlternativesHitboxesRef) {
          const hoveredIndex = p.getMarketAlternativesHoveredIndex?.() ?? null;
          renderMarketAlternatives({
            ctx,
            width,
            startY: mainHeight / 2,
            alternatives,
            hoveredIndex,
            hitboxesRef: p.marketAlternativesHitboxesRef,
          });
        }

        rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
        return;
      }

      // Static layer cache
      const colors = { bullishColor: settings.bullishColor, bearishColor: settings.bearishColor };
      const candleCount = candles.length;
      const lastCandle = candleCount > 0 ? candles[candleCount - 1] : null;
      const staticKey = `${viewport.timeStart}|${viewport.timeEnd}|${viewport.priceMin}|${viewport.priceMax}|${candleCount}|${lastCandle?.startTime ?? 0}|${lastCandle?.close ?? 0}|${width}|${mainHeight}|${mode}|${settings.bullishColor}|${settings.bearishColor}`;

      if (staticKey !== staticKeyRef.current || !staticCanvasRef.current) {
        if (
          !staticCanvasRef.current ||
          staticCanvasRef.current.width !== Math.round(width) ||
          staticCanvasRef.current.height !== Math.round(mainHeight)
        ) {
          staticCanvasRef.current = new OffscreenCanvas(Math.round(width), Math.round(mainHeight));
          staticCtxRef.current = staticCanvasRef.current.getContext('2d');
        }
        const sctx = staticCtxRef.current;
        if (sctx) {
          sctx.clearRect(0, 0, width, mainHeight);
          renderGrid({ ctx: sctx as unknown as CanvasRenderingContext2D, viewport, width, height: mainHeight, timeframeMs: p.getTimeframeMs() });
          renderCandles({ ctx: sctx as unknown as CanvasRenderingContext2D, viewport, candles, liveCandle: null, width, height: mainHeight, timeframeMs: p.getTimeframeMs(), mode, settings: colors });
          renderAxes({ ctx: sctx as unknown as CanvasRenderingContext2D, viewport, width, height: mainHeight, digits });
        }
        staticKeyRef.current = staticKey;
      }

      // Blit static layer
      if (staticCanvasRef.current) {
        ctx.drawImage(staticCanvasRef.current, 0, 0);
      }

      // Dynamic layers: live candle, price line
      if (liveCandle) {
        renderCandles({ ctx, viewport, candles: [], liveCandle, width, height: mainHeight, timeframeMs: p.getTimeframeMs(), mode, settings: colors });
        renderPriceLine({ ctx, viewport, currentPrice: liveCandle.close, width, height: mainHeight, digits });
      }

      // Min/max price labels
      if (candles.length > 0) {
        renderCandleMinMaxLabels({ ctx, viewport, candles, liveCandle, width, height: mainHeight, digits });
      }

      // Expiration overlay: animated vertical line
      const rawExpirationTimestamp = p.getExpirationTime?.();
      if (rawExpirationTimestamp != null && Number.isFinite(rawExpirationTimestamp) && viewport.timeEnd > viewport.timeStart) {
        const EXP_ANIM_DURATION_MS = 320;
        const PRICE_LABEL_AREA_WIDTH = 60;
        const TIME_LABEL_HEIGHT = 25;
        
        const currentTarget = expirationTargetTimeRef.current;
        const currentRender = expirationRenderTimeRef.current;

        if (currentRender == null || currentTarget == null) {
          expirationRenderTimeRef.current = rawExpirationTimestamp;
          expirationTargetTimeRef.current = rawExpirationTimestamp;
          expirationAnimStartTimeRef.current = null;
          expirationAnimStartValueRef.current = null;
        } else {
          const delta = Math.abs(rawExpirationTimestamp - currentTarget);
          const SHOULD_RETARGET = delta > 1500;

          if (SHOULD_RETARGET && rawExpirationTimestamp !== currentTarget) {
            expirationTargetTimeRef.current = rawExpirationTimestamp;
            expirationAnimStartTimeRef.current = now;
            expirationAnimStartValueRef.current = currentRender;
          }

          const animStartTime = expirationAnimStartTimeRef.current;
          const animStartValue = expirationAnimStartValueRef.current;
          const target = expirationTargetTimeRef.current ?? rawExpirationTimestamp;

          if (animStartTime != null && animStartValue != null) {
            const elapsed = now - animStartTime;
            const progress = Math.min(1, Math.max(0, elapsed / EXP_ANIM_DURATION_MS));
            const t = progress ** 3 * (progress * (6 * progress - 15) + 10);
            const animated = animStartValue + (target - animStartValue) * t;
            expirationRenderTimeRef.current = animated;
          } else {
            expirationRenderTimeRef.current = target;
          }
        }

        const expirationX = ((expirationRenderTimeRef.current - viewport.timeStart) / (viewport.timeEnd - viewport.timeStart)) * width;
        const maxX = width - PRICE_LABEL_AREA_WIDTH;
        if (expirationX >= 0 && expirationX <= maxX) {
          ctx.save();
          
          const CIRCLE_RADIUS = 18;
          const isMobile = width < 600;
          const CIRCLE_Y = isMobile ? 78 : 30;
          const circleX = expirationX;
          const circleY = CIRCLE_Y;
          
          ctx.fillStyle = '#40648f';
          ctx.beginPath();
          ctx.arc(circleX, circleY, CIRCLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Checkered flag icon
          const cols = 5;
          const rows = 3;
          const flagWidth = CIRCLE_RADIUS * 1.1;
          const flagHeight = CIRCLE_RADIUS * 0.78;
          const flagX = circleX;
          const flagY = circleY;
          const cellWidth = flagWidth / cols;
          const cellHeight = flagHeight / rows;
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 0.5;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const cellX = flagX - flagWidth / 2 + col * cellWidth;
              const cellY = flagY - flagHeight / 2 + row * cellHeight;
              ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
              ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
              ctx.strokeRect(cellX, cellY, cellWidth, cellHeight);
            }
          }

          ctx.strokeStyle = 'rgba(64, 100, 143, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(expirationX, circleY + CIRCLE_RADIUS);
          ctx.lineTo(expirationX, mainHeight - TIME_LABEL_HEIGHT);
          ctx.stroke();

          ctx.restore();
        }
      } else {
        expirationRenderTimeRef.current = null;
        expirationTargetTimeRef.current = null;
        expirationAnimStartTimeRef.current = null;
        expirationAnimStartValueRef.current = null;
      }

      // Trade expiry vertical lines - fixed marker at each open trade's expiresAt
      if (p.getTrades) {
        const openTrades = p.getTrades().filter(t => t.expiresAt > now - 500);
        const PRICE_LABEL_AREA_WIDTH = 60;
        const TIME_LABEL_HEIGHT = 25;
        for (const trade of openTrades) {
          const tx = ((trade.expiresAt - viewport.timeStart) / (viewport.timeEnd - viewport.timeStart)) * width;
          const maxX = width - PRICE_LABEL_AREA_WIDTH;
          if (tx < 0 || tx > maxX) continue;
          const isCall = trade.direction === 'CALL';
          const lineColor = isCall ? 'rgba(74, 222, 128, 0.55)' : 'rgba(248, 113, 113, 0.55)';
          const dotColor = isCall ? '#4ade80' : '#f87171';
          ctx.save();
          // Dashed vertical line
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(tx, 0);
          ctx.lineTo(tx, mainHeight - TIME_LABEL_HEIGHT);
          ctx.stroke();
          ctx.setLineDash([]);
          // Small dot at top
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(tx, 8, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // CALL/PUT button hover highlight
      const hoverAction = p.getHoverAction?.();
      if (hoverAction) {
        const liveCandle = p.getLiveCandleForRender(animatedCandle);
        const currentPrice = liveCandle?.close;
        if (currentPrice != null && liveCandle) {
          const priceRange = viewport.priceMax - viewport.priceMin;
          if (priceRange > 0) {
            const normalizedPrice = (currentPrice - viewport.priceMin) / priceRange;
            const priceY = mainHeight - (normalizedPrice * mainHeight);
            
            // X position of the live candle center
            const timeframeMs = p.getTimeframeMs();
            const candleCenterTime = liveCandle.startTime + timeframeMs / 2;
            const timeRange = viewport.timeEnd - viewport.timeStart;
            const lastDataPointX = timeRange > 0
              ? ((candleCenterTime - viewport.timeStart) / timeRange) * width
              : null;
            
            renderHoverHighlight({
              ctx,
              hoverAction,
              priceY,
              width,
              height: mainHeight,
              arrowUpImg: p.getArrowUpImg?.(),
              arrowDownImg: p.getArrowDownImg?.(),
              lastDataPointX,
            });
          }
        }
      }

      // Price alerts
      const alerts = p.getPriceAlerts();
      if (alerts.length > 0) {
        renderPriceAlerts({
          ctx,
          viewport,
          width,
          height: mainHeight,
          alerts,
        });
      }

      // Indicators
      if (indicators.length > 0) {
        renderIndicators({
          ctx,
          indicators,
          indicatorConfigs: p.indicatorConfigs,
          viewport,
          width,
          height: mainHeight,
          rsiHeight,
          stochHeight,
          momentumHeight,
          awesomeOscillatorHeight,
          macdHeight,
          atrHeight,
          adxHeight,
        });
      }

      // Crosshair
      const crosshair = p.getCrosshair();
      renderCrosshair({
        ctx,
        crosshair,
        width,
        height: mainHeight,
        registerInteractionZone: p.registerInteractionZone,
        digits,
      });

      // Trade overlays
      if (p.getTrades) {
        const allTrades = p.getTrades();
        const recentClosedTrades = p.getRecentClosedTrades ? p.getRecentClosedTrades() : [];

        const visibleTradeIds = visibleIds || new Set<string>();
        const trades = visibleIds
          ? allTrades.filter((t) => visibleTradeIds.has(t.id))
          : allTrades;
        const recentClosed = visibleIds
          ? recentClosedTrades.filter((t) => visibleTradeIds.has(t.id))
          : recentClosedTrades;

        // Current price for P&L calculation
        const liveCandle = p.getLiveCandleForRender(animatedCandle);
        const currentPrice = liveCandle?.close;
        
        if (trades.length > 0 || recentClosed.length > 0) {
          const candles = p.getRenderCandles();
          const timeframeMs = p.getTimeframeMs();
          
          renderTrades({
            ctx,
            trades,
            recentClosedTrades: recentClosed,
            viewport,
            width,
            height: mainHeight,
            digits,
            currentPrice,
            candles,
            liveCandle,
            timeframeMs,
            payoutPercent: p.getPayoutPercent?.() ?? 75,
          });
        }
      }

      // Drawings
      const allDrawings = p.getDrawings();
      const drawings = visibleIds
        ? allDrawings.filter((d) => visibleIds.has(d.id))
        : allDrawings;
      renderDrawings({
        ctx,
        drawings,
        viewport,
        width,
        height: mainHeight,
        hoveredDrawingId: p.getHoveredDrawingId(),
        selectedDrawingId: p.getSelectedDrawingId(),
      });

      // OHLC panel
      p.updateOhlc();

      const ohlc = p.getOhlc();
      renderOhlcPanel({
        ctx,
        ohlc,
        width,
        height: mainHeight,
        digits,
      });


      // Server time overlay
      const timeText = p.getServerTimeText?.();
      if (timeText) {
        ctx.save();
        ctx.font = LABEL_FONT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        // Offset for mobile layout
        const timeY = width < 768 ? 20 : 60;
        ctx.fillText(timeText, 18, timeY);
        ctx.restore();
      }

      // Countdown timer next to live candle
      if (liveCandle && p.getTimeframeLabel && p.getFormattedCountdown && settings.showCountdown) {
        const timeRange = viewport.timeEnd - viewport.timeStart;
        const CANDLE_GAP = 0.5;
        const MAX_CANDLE_PX = 200;
        const rawWidth = timeRange > 0 ? (p.getTimeframeMs() / timeRange) * width : 0;
        const distanceBetweenCenters = rawWidth;
        const effectiveMaxWidth = Math.max(0, distanceBetweenCenters - CANDLE_GAP);
        const candleWidth = Math.min(MAX_CANDLE_PX, effectiveMaxWidth);

        renderCountdown({
          ctx,
          viewport,
          liveCandle,
          width,
          height: mainHeight,
          timeframeMs: p.getTimeframeMs(),
          timeframeLabel: p.getTimeframeLabel(),
          remainingTime: p.getFormattedCountdown(),
          candleWidth,
        });
      }

      // Time axis overlay: перерисовываем полосу временных меток поверх индикаторов и рисований,
      // чтобы они никогда не перекрывали метки времени внизу графика.
      renderTimeAxisOverlay({ ctx, viewport, width, height: mainHeight });

      // Crosshair time label
      if (crosshair?.isActive) {
        renderCrosshairTimeLabel(ctx, crosshair, width, mainHeight);
      }

      // Continue loop
      rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));
    };

    // Start render loop
    rafIdRef.current = requestAnimationFrame((timestamp) => render(timestamp));

    // Teardown
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [canvasRef]);
}
