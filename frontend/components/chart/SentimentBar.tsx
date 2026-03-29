/**
 * SentimentBar - полоса распределения CALL/PUT (вертикальная или горизонтальная)
 * FLOW S1: Market Sentiment / Traders Distribution Bar
 * 
 * Отдельный canvas, не связанный с основным графиком.
 * Accepts externalBuyRatio (0..1) from real data; defaults to 0.5.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface SentimentBarProps {
  height?: number;
  width?: number;
  orientation?: 'vertical' | 'horizontal';
  /** Real buy ratio 0..1; defaults to 0.5 when no data. */
  externalBuyRatio?: number;
  onPercentagesChange?: (buy: number, sell: number) => void;
}

export function SentimentBar({ height = 600, width = 12, orientation = 'vertical', externalBuyRatio = 0.5, onPercentagesChange }: SentimentBarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentBuyRef = useRef(externalBuyRatio);
  const rafIdRef = useRef<number | null>(null);
  const [buyPercentage, setBuyPercentage] = useState(Math.round(externalBuyRatio * 100));
  const [sellPercentage, setSellPercentage] = useState(100 - Math.round(externalBuyRatio * 100));
  const lastBuyPctRef = useRef<number>(Math.round(externalBuyRatio * 100));
  const targetBuyRef = useRef(externalBuyRatio);
  const [actualWidth, setActualWidth] = useState(orientation === 'horizontal' ? 0 : width);
  const [actualHeight, setActualHeight] = useState(orientation === 'horizontal' ? 12 : height);

  useEffect(() => {
    targetBuyRef.current = externalBuyRatio;
  }, [externalBuyRatio]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    currentBuyRef.current += (targetBuyRef.current - currentBuyRef.current) * 0.07;

    const buyRatio = currentBuyRef.current;

    const newBuyPct = Math.round(buyRatio * 100);
    const newSellPct = 100 - newBuyPct;

    if (Math.abs(newBuyPct - lastBuyPctRef.current) >= 1) {
      setBuyPercentage(newBuyPct);
      setSellPercentage(newSellPct);
      lastBuyPctRef.current = newBuyPct;
      if (onPercentagesChange) {
        onPercentagesChange(newBuyPct, newSellPct);
      }
    }

    const borderRadius = 4;
    const padding = 1;

    if (orientation === 'horizontal') {
      const w = actualWidth;
      const h = actualHeight;
      const buyWidth = w * buyRatio;
      const sellWidth = w - buyWidth;
      const innerHeight = h - padding * 2;
      const innerY = padding;

      ctx.clearRect(0, 0, w, h);

      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, borderRadius);
      ctx.clip();

      ctx.fillStyle = '#45b833';
      ctx.fillRect(0, innerY, buyWidth, innerHeight);

      ctx.fillStyle = '#ff3d1f';
      ctx.fillRect(buyWidth, innerY, sellWidth, innerHeight);

      ctx.restore();
      ctx.save();

      const diamondWidth = 4;
      const dividerX = Math.max(diamondWidth, Math.min(w - diamondWidth, buyWidth));
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(dividerX, 0);
      ctx.lineTo(dividerX + diamondWidth, h / 2);
      ctx.lineTo(dividerX, h);
      ctx.lineTo(dividerX - diamondWidth, h / 2);
      ctx.closePath();
      ctx.fill();
    } else {
      const buyHeight = actualHeight * buyRatio;
      const sellHeight = actualHeight - buyHeight;
      const innerWidth = width - padding * 2;
      const innerX = padding;

      ctx.clearRect(0, 0, width, actualHeight);

      ctx.beginPath();
      ctx.roundRect(0, 0, width, actualHeight, borderRadius);
      ctx.clip();

      ctx.fillStyle = '#ff3d1f';
      ctx.fillRect(innerX, actualHeight - sellHeight, innerWidth, sellHeight);

      ctx.fillStyle = '#45b833';
      ctx.fillRect(innerX, 0, innerWidth, buyHeight);

      ctx.restore();
      ctx.save();

      const dividerY = buyHeight;
      const diamondHeight = 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(innerX, dividerY);
      ctx.lineTo(width / 2, dividerY - diamondHeight);
      ctx.lineTo(innerX + innerWidth, dividerY);
      ctx.lineTo(width / 2, dividerY + diamondHeight);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (orientation === 'horizontal') {
        if (w > 0) setActualWidth(w);
        if (h > 0) setActualHeight(h);
      } else {
        if (h > 0) setActualHeight(h);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [orientation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (orientation === 'vertical' && actualHeight === 0) return;
    if (orientation === 'horizontal' && (actualWidth === 0 || actualHeight === 0)) return;

    const dpr = window.devicePixelRatio || 1;
    const w = orientation === 'horizontal' ? actualWidth : width;
    const h = actualHeight;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const animate = () => {
      render();
      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [actualHeight, actualWidth, width, orientation]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        width: isHorizontal ? '100%' : `${width}px`,
        height: isHorizontal ? '6px' : '100%',
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
