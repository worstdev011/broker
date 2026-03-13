/**
 * FLOW L-UI: Render Background - фон графика
 * 
 * Используется и для свечного, и для линейного графика.
 * Цвет фона соответствует цвету страницы терминала (#061230).
 */

import { BG_COLOR } from '../../chartTheme';

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);
}
