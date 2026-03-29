/**
 * renderMarketAlternatives.ts - отрисовка списка альтернативных торговых пар
 * 
 * FLOW C-MARKET-ALTERNATIVES: Список альтернативных пар с наибольшей доходностью
 */

export interface MarketAlternative {
  instrumentId: string;
  label: string;
  payout: number;
}

export interface AlternativeHitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  instrumentId: string;
}

interface RenderMarketAlternativesParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  startY: number;
  alternatives: MarketAlternative[];
  hoveredIndex: number | null; // FLOW C-MARKET-ALTERNATIVES: индекс наведенной строки
  hitboxesRef: { current: AlternativeHitbox[] }; // Ref для хранения hitboxes
  header?: string;
}

/**
 * Рисует список альтернативных торговых пар
 */
export function renderMarketAlternatives({
  ctx,
  width,
  startY,
  alternatives,
  hoveredIndex,
  hitboxesRef,
  header,
}: RenderMarketAlternativesParams): void {
  if (alternatives.length === 0) {
    hitboxesRef.current = [];
    return;
  }

  ctx.save();

  // Заголовок секции
  ctx.font = '500 13px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#9aa4b2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  const headerY = startY - 24;
  ctx.fillText(header ?? 'Highest payout markets', width / 2, headerY);

  // Разделительная линия
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 160, headerY + 16);
  ctx.lineTo(width / 2 + 160, headerY + 16);
  ctx.stroke();

  // Параметры элементов списка
  const itemHeight = 36;
  const itemWidth = 320;
  const itemSpacing = 8;
  const listTopPadding = 14; // Отступ от заголовка вниз до первого элемента
  const x = width / 2 - itemWidth / 2;

  hitboxesRef.current = [];

  alternatives.forEach((item, i) => {
    const y = startY + listTopPadding + i * (itemHeight + itemSpacing);
    const isHovered = hoveredIndex === i;

    // Фон элемента (подсветка при hover)
    ctx.fillStyle = isHovered 
      ? 'rgba(255, 255, 255, 0.12)' 
      : 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x, y, itemWidth, itemHeight);

    // Label (название пары)
    ctx.font = '500 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.label, x + 12, y + itemHeight / 2);

    // Payout (доходность) справа
    ctx.font = '600 13px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#4ade80'; // Зеленый цвет
    ctx.textAlign = 'right';
    ctx.fillText(`${item.payout}%`, x + itemWidth - 12, y + itemHeight / 2);

    // Стрелка вправо
    ctx.fillStyle = '#9aa4b2';
    ctx.font = '16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('→', x + itemWidth - 48, y + itemHeight / 2);

    // Сохраняем hitbox для кликов
    hitboxesRef.current.push({
      x,
      y,
      width: itemWidth,
      height: itemHeight,
      instrumentId: item.instrumentId,
    });
  });

  ctx.restore();
}
