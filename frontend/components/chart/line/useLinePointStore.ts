/**
 * LinePointStore — хранилище price points для линейного графика
 *
 * Каждый тик = отдельная точка (tick-level granularity, как Pocket Option).
 * Snapshot/history может быть менее гранулярным (1/сек), что нормально.
 */

import { useRef } from 'react';

export type PricePoint = {
  time: number;   // timestamp (ms)
  price: number;
};

const MAX_POINTS = 7000;

export function useLinePointStore() {
  const pointsRef = useRef<PricePoint[]>([]);

  /**
   * Добавить точку в конец. Дедуплицирует по timestamp,
   * игнорирует out-of-order тики (time < last).
   */
  function push(point: PricePoint): void {
    const arr = pointsRef.current;

    if (arr.length > 0) {
      const last = arr[arr.length - 1];
      if (point.time === last.time) {
        last.price = point.price;
        return;
      }
      if (point.time < last.time) return;

      const gapMs = point.time - last.time;
      if (gapMs > 1000) {
        const steps = Math.min(Math.floor(gapMs / 1000), 60);
        for (let i = 1; i <= steps; i++) {
          arr.push({ time: last.time + i * 1000, price: last.price });
        }
      }
    }

    arr.push(point);
    if (arr.length > MAX_POINTS) {
      arr.splice(0, arr.length - MAX_POINTS);
    }
  }

  /**
   * Добавить несколько точек в конец
   */
  function appendMany(points: PricePoint[]): void {
    const arr = pointsRef.current;
    arr.push(...points);

    // Ограничиваем размер
    if (arr.length > MAX_POINTS) {
      arr.splice(0, arr.length - MAX_POINTS);
    }
  }

  /**
   * Добавить точки в начало (для infinite scroll истории)
   * 🔥 FIX: Фильтрует дубликаты по timestamp — безопасен при повторном запросе истории
   */
  function prepend(points: PricePoint[]): void {
    const arr = pointsRef.current;

    if (arr.length === 0) {
      const sorted = [...points].sort((a, b) => a.time - b.time);
      arr.push(...sorted);
    } else {
      const earliestExisting = arr[0].time;
      const filtered = points
        .filter(p => p.time < earliestExisting)
        .sort((a, b) => a.time - b.time);
      if (filtered.length > 0) {
        arr.unshift(...filtered);
      }
    }

    // Ограничиваем размер: удаляем новые точки справа
    if (arr.length > MAX_POINTS) {
      arr.splice(MAX_POINTS);
    }
  }

  /**
   * Получить все точки
   */
  function getAll(): PricePoint[] {
    return pointsRef.current;
  }

  /**
   * Получить первую точку (самую старую)
   */
  function getFirst(): PricePoint | null {
    const points = pointsRef.current;
    return points.length > 0 ? points[0] : null;
  }

  /**
   * Получить последнюю точку (самую новую)
   */
  function getLast(): PricePoint | null {
    const points = pointsRef.current;
    return points.length > 0 ? points[points.length - 1] : null;
  }

  /**
   * Получить точки в диапазоне времени
   */
  function getPointsInRange(timeStart: number, timeEnd: number): PricePoint[] {
    return pointsRef.current.filter(
      (point) => point.time >= timeStart && point.time <= timeEnd
    );
  }

  /**
   * Очистить все точки
   */
  function reset(): void {
    pointsRef.current = [];
  }

  /**
   * Получить количество точек
   */
  function getCount(): number {
    return pointsRef.current.length;
  }

  return {
    push,
    appendMany,
    prepend,
    getAll,
    getFirst,
    getLast,
    getPointsInRange,
    reset,
    getCount,
  };
}
