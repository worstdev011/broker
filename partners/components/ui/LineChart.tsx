'use client';

import { useRef, useEffect } from 'react';
import type { PartnerChartPoint } from '@/types/partners';

type ChartMetric = 'clicks' | 'registrations' | 'ftd' | 'earnings';

interface LineChartProps {
  data: PartnerChartPoint[];
  metric: ChartMetric;
}

function getValues(data: PartnerChartPoint[], metric: ChartMetric): number[] {
  return data.map((d) =>
    metric === 'earnings' ? parseFloat(d.earnings) : (d[metric] as number),
  );
}

export function LineChart({ data, metric }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PL = 44, PR = 12, PT = 14, PB = 28;
    const cW = W - PL - PR;
    const cH = H - PT - PB;

    ctx.clearRect(0, 0, W, H);

    const values = getValues(data, metric);
    const maxVal = Math.max(...values, 1);

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = PT + cH - (i / 4) * cH;
      ctx.strokeStyle = 'rgba(197,255,71,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PL, y);
      ctx.lineTo(PL + cW, y);
      ctx.stroke();

      const val = (maxVal * i) / 4;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = `${10 * dpr / dpr}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(
        val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val).toString(),
        PL - 6,
        y + 4,
      );
    }

    // X labels every 5 days
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < data.length; i += 5) {
      const x = PL + (i / (data.length - 1)) * cW;
      ctx.fillText(data[i].date.slice(5), x, H - PB + 14);
    }

    const pts = values.map((v, i) => ({
      x: PL + (i / Math.max(data.length - 1, 1)) * cW,
      y: PT + cH - (v / maxVal) * cH,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
    grad.addColorStop(0, 'rgba(197,255,71,0.18)');
    grad.addColorStop(1, 'rgba(197,255,71,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, PT + cH);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, PT + cH);
    ctx.closePath();
    ctx.fill();

    // Line with glow
    ctx.shadowColor = 'rgba(197,255,71,0.5)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#C5FF47';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#C5FF47';
      ctx.shadowColor = 'rgba(197,255,71,0.9)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [data, metric]);

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />;
}
