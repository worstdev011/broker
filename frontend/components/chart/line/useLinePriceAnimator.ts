/**
 * useLinePriceAnimator — плавная анимация цены live-сегмента линейного графика
 *
 * Ответственность:
 * - Плавное движение конца линии к новой цене (lerp + easeOutCubic, 150ms)
 * - Только presentation layer: animatedPrice берётся из аниматора в render loop
 */

import { useRef } from 'react';

const DURATION_MS = 80;

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

const easeOutCubic = (t: number): number =>
  1 - Math.pow(1 - t, 3);

export interface UseLinePriceAnimatorReturn {
  getAnimatedPrice: () => number;
  onPriceUpdate: (price: number) => void;
  update: (now: number) => void;
  reset: () => void;
  /** Якорь при первом появлении live-сегмента (fromPrice), чтобы не было скачка */
  seedFrom: (price: number) => void;
  /** Сброс только hasValueRef — разрешить seed на следующем live-сегменте (НЕ полный reset) */
  clearLiveState: () => void;
  /** Мгновенный переход к цене без анимации (для second-boundary transitions) */
  snapTo: (price: number) => void;
}

export function useLinePriceAnimator(): UseLinePriceAnimatorReturn {
  const valueRef = useRef<number>(0);
  /** 🔥 Флаг: есть ли у аниматора инициализированное значение
   * Если false — можно делать seedFrom (первый запуск)
   * Если true — НЕ делаем seed, аниматор уже живёт своей жизнью
   */
  const hasValueRef = useRef<boolean>(false);
  const animationRef = useRef<{
    from: number;
    to: number;
    startTime: number;
    duration: number;
    active: boolean;
  }>({
    from: 0,
    to: 0,
    startTime: 0,
    duration: DURATION_MS,
    active: false,
  });

  const onPriceUpdate = (price: number): void => {
    if (!hasValueRef.current) {
      snapTo(price);
      return;
    }

    const current = valueRef.current;
    if (Math.abs(current - price) < 1e-8) return;

    animationRef.current = {
      from: current,
      to: price,
      startTime: performance.now(),
      duration: DURATION_MS,
      active: true,
    };
  };

  const update = (now: number): void => {
    const anim = animationRef.current;
    if (!anim.active) return;

    const progress = clamp((now - anim.startTime) / anim.duration, 0, 1);
    const eased = easeOutCubic(progress);
    valueRef.current = lerp(anim.from, anim.to, eased);

    if (progress >= 1) {
      anim.active = false;
    }
  };

  const getAnimatedPrice = (): number => valueRef.current;

  const reset = (): void => {
    valueRef.current = 0;
    hasValueRef.current = false;
    animationRef.current = {
      from: 0,
      to: 0,
      startTime: 0,
      duration: DURATION_MS,
      active: false,
    };
  };

  const seedFrom = (price: number): void => {
    // Seed только если аниматор ещё не инициализирован
    if (!hasValueRef.current) {
      valueRef.current = price;
      hasValueRef.current = true;
      animationRef.current = {
        from: price,
        to: price,
        startTime: 0,
        duration: DURATION_MS,
        active: false,
      };
    }
  };

  /** 🔥 Разрешить seed на следующем live-сегменте (НЕ полный reset, только hasValueRef) */
  const clearLiveState = (): void => {
    hasValueRef.current = false;
  };

  const snapTo = (price: number): void => {
    valueRef.current = price;
    hasValueRef.current = true;
    animationRef.current = {
      from: price,
      to: price,
      startTime: 0,
      duration: DURATION_MS,
      active: false,
    };
  };

  return {
    getAnimatedPrice,
    onPriceUpdate,
    update,
    reset,
    seedFrom,
    clearLiveState,
    snapTo,
  };
}
