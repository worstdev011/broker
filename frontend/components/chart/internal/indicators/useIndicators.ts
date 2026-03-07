/**
 * useIndicators - оркестрация индикаторов
 * 
 * FLOW G12: Indicators orchestration
 * 
 * Ответственность:
 * - Вычисление индикаторов на основе закрытых свечей
 * - Кеширование результатов
 * - Предоставление серий для рендера
 * 
 * ❌ ЗАПРЕЩЕНО:
 * - считать индикаторы в RAF
 * - использовать live-свечу
 * - мутировать candles
 * - useState
 * - websocket
 */

import { useRef, useEffect } from 'react';
import type { Candle } from '../chart.types';
import type { IndicatorSeries, IndicatorConfig } from './indicator.types';
import { getActiveIndicators } from './indicatorRegistry';
import { calculateSMA } from './calculations/sma';
import { calculateEMA } from './calculations/ema';
import { calculateBollingerBands } from './calculations/bollinger';
import { calculateRSI } from './calculations/rsi';
import { calculateStochastic } from './calculations/stochastic';
import { calculateMomentum } from './calculations/momentum';
import { calculateAwesomeOscillator } from './calculations/awesomeOscillator';
import { calculateMACD } from './calculations/macd';
import { calculateKeltnerChannels } from './calculations/keltner';
import { calculateIchimoku } from './calculations/ichimoku';
import { calculateATR } from './calculations/atr';
import { calculateADX } from './calculations/adx';

interface UseIndicatorsParams {
  getCandles: () => Candle[];
  indicatorConfigs: IndicatorConfig[]; // Конфигурация индикаторов с enabled/disabled
}

interface UseIndicatorsReturn {
  getIndicatorSeries: () => IndicatorSeries[];
}

/**
 * Вычисляет индикатор на основе типа
 */
type IndicatorResult =
  | Array<{ time: number; value: number }>
  | { k: Array<{ time: number; value: number }>; d: Array<{ time: number; value: number }> }
  | { upper: Array<{ time: number; value: number }>; middle: Array<{ time: number; value: number }>; lower: Array<{ time: number; value: number }> }
  | { macd: Array<{ time: number; value: number }>; signal: Array<{ time: number; value: number }>; histogram: Array<{ time: number; value: number }> }
  | { tenkan: Array<{ time: number; value: number }>; kijun: Array<{ time: number; value: number }>; senkouA: Array<{ time: number; value: number }>; senkouB: Array<{ time: number; value: number }>; chikou: Array<{ time: number; value: number }> }
  | { adx: Array<{ time: number; value: number }>; plusDI: Array<{ time: number; value: number }>; minusDI: Array<{ time: number; value: number }> };

function calculateIndicator(
  candles: Candle[],
  config: IndicatorConfig
): IndicatorResult {
  const { type, period, periodD, stdDevMult, atrMult, fastPeriod, slowPeriod, signalPeriod, basePeriod, spanBPeriod, displacement } = config;
  switch (type) {
    case 'SMA':
      return calculateSMA(candles, period);
    case 'EMA':
      return calculateEMA(candles, period);
    case 'BollingerBands':
      return calculateBollingerBands(candles, period, stdDevMult ?? 2);
    case 'RSI':
      return calculateRSI(candles, period);
    case 'Stochastic':
      return calculateStochastic(candles, period, periodD ?? 3);
    case 'Momentum':
      return calculateMomentum(candles, period);
    case 'AwesomeOscillator':
      return calculateAwesomeOscillator(candles, period, fastPeriod ?? 5);
    case 'MACD':
      return calculateMACD(candles, period, slowPeriod ?? 26, signalPeriod ?? 9);
    case 'KeltnerChannels':
      return calculateKeltnerChannels(candles, period, config.atrMult ?? 2);
    case 'Ichimoku':
      return calculateIchimoku(candles, period, basePeriod ?? 26, spanBPeriod ?? 52, displacement ?? 26);
    case 'ATR':
      return calculateATR(candles, period);
    case 'ADX':
      return calculateADX(candles, period);
    default:
      return [];
  }
}

export function useIndicators({
  getCandles,
  indicatorConfigs,
}: UseIndicatorsParams): UseIndicatorsReturn {
  // Кеш результатов через useRef
  const seriesCacheRef = useRef<IndicatorSeries[]>([]);
  const lastCandlesLengthRef = useRef<number>(0);
  const configsRef = useRef<IndicatorConfig[]>(indicatorConfigs);

  // Обновляем configs ref
  useEffect(() => {
    configsRef.current = indicatorConfigs;
  }, [indicatorConfigs]);

  /**
   * Пересчитать все индикаторы
   */
  const recalculateIndicators = () => {
    const candles = getCandles();
    
    // Берём ТОЛЬКО закрытые свечи
    const closedCandles = candles.filter(c => c.isClosed);

    // Если данных недостаточно, очищаем кеш
    if (closedCandles.length === 0) {
      seriesCacheRef.current = [];
      return;
    }

    // Получаем только включенные индикаторы
    const activeConfigs = getActiveIndicators(configsRef.current);
    
    if (activeConfigs.length === 0) {
      seriesCacheRef.current = [];
      return;
    }

    const series: IndicatorSeries[] = [];

    for (const config of activeConfigs) {
      const result = calculateIndicator(closedCandles, config);
      if (config.type === 'Stochastic' && typeof result === 'object' && 'k' in result && 'd' in result) {
        series.push({ id: config.id + '_k', type: 'Stochastic', points: result.k });
        series.push({ id: config.id + '_d', type: 'Stochastic', points: result.d });
      } else if (
        config.type === 'BollingerBands' &&
        typeof result === 'object' &&
        'upper' in result &&
        'middle' in result &&
        'lower' in result
      ) {
        series.push({ id: config.id + '_upper', type: 'BollingerBands', points: result.upper });
        series.push({ id: config.id + '_middle', type: 'BollingerBands', points: result.middle });
        series.push({ id: config.id + '_lower', type: 'BollingerBands', points: result.lower });
      } else if (
        config.type === 'KeltnerChannels' &&
        typeof result === 'object' &&
        'upper' in result &&
        'middle' in result &&
        'lower' in result
      ) {
        series.push({ id: config.id + '_upper', type: 'KeltnerChannels', points: result.upper });
        series.push({ id: config.id + '_middle', type: 'KeltnerChannels', points: result.middle });
        series.push({ id: config.id + '_lower', type: 'KeltnerChannels', points: result.lower });
      } else if (
        config.type === 'Ichimoku' &&
        typeof result === 'object' &&
        'tenkan' in result &&
        'kijun' in result &&
        'senkouA' in result &&
        'senkouB' in result &&
        'chikou' in result
      ) {
        series.push({ id: config.id + '_tenkan', type: 'Ichimoku', points: result.tenkan });
        series.push({ id: config.id + '_kijun', type: 'Ichimoku', points: result.kijun });
        series.push({ id: config.id + '_senkouA', type: 'Ichimoku', points: result.senkouA });
        series.push({ id: config.id + '_senkouB', type: 'Ichimoku', points: result.senkouB });
        series.push({ id: config.id + '_chikou', type: 'Ichimoku', points: result.chikou });
      } else if (
        config.type === 'ADX' &&
        typeof result === 'object' &&
        'adx' in result &&
        'plusDI' in result &&
        'minusDI' in result
      ) {
        series.push({ id: config.id + '_adx', type: 'ADX', points: result.adx });
        series.push({ id: config.id + '_plusDI', type: 'ADX', points: result.plusDI });
        series.push({ id: config.id + '_minusDI', type: 'ADX', points: result.minusDI });
      } else if (
        config.type === 'MACD' &&
        typeof result === 'object' &&
        'macd' in result &&
        'signal' in result &&
        'histogram' in result
      ) {
        series.push({ id: config.id + '_macd', type: 'MACD', points: result.macd });
        series.push({ id: config.id + '_signal', type: 'MACD', points: result.signal });
        series.push({ id: config.id + '_histogram', type: 'MACD', points: result.histogram });
      } else if (Array.isArray(result)) {
        series.push({
          id: config.id,
          type: config.type,
          points: result,
        });
      }
    }

    seriesCacheRef.current = series;
    lastCandlesLengthRef.current = closedCandles.length;
  };

  /**
   * Получить серии индикаторов
   */
  const getIndicatorSeries = (): IndicatorSeries[] => {
    const candles = getCandles();
    const closedCandles = candles.filter(c => c.isClosed);

    // Пересчитываем, если количество свечей изменилось или конфигурация
    if (closedCandles.length !== lastCandlesLengthRef.current) {
      recalculateIndicators();
    }

    return seriesCacheRef.current;
  };

  const lastConfigKeyRef = useRef<string>('');
  useEffect(() => {
    const configKey = indicatorConfigs
      .filter(c => c.enabled !== false)
      .map(c => `${c.id}:${c.period}`)
      .join(',');
    if (configKey !== lastConfigKeyRef.current) {
      lastConfigKeyRef.current = configKey;
      lastCandlesLengthRef.current = -1;
      recalculateIndicators();
    }
  }, [indicatorConfigs]);

  return {
    getIndicatorSeries,
  };
}
