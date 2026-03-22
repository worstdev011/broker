'use client';

import { forwardRef, useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { useWebSocket, type TradeClosePayload } from '@/lib/hooks/useWebSocket';
import { dismissToastByKey, showTradeOpenToast, showTradeCloseToast } from '@/stores/toast.store';
import { api } from '@/lib/api/api';
import { logger } from '@/lib/logger';
import type { IndicatorConfig } from '../internal/indicators/indicator.types';
import type { OverlayRegistryParams } from '../useChart';
import type { Drawing } from '../internal/drawings/drawing.types';
import { clampToDataBounds } from '../internal/interactions/math';

// ═══════════════════════════════════════════════════════════════════════
// Committed Trail Line Chart
// Golden rule: once a pixel is drawn, it NEVER moves.
// ═══════════════════════════════════════════════════════════════════════

interface Point { time: number; price: number; }
interface TradeOverlay {
  id: string;
  direction: 'CALL' | 'PUT';
  entryPrice: number;
  openedAt: number;
  expiresAt: number;
  amount?: number;
  result?: 'WIN' | 'LOSS' | 'TIE';
  closedAt?: number;
  pnl?: number;
}

const BG = '#061230';
const GRID_C = 'rgba(255,255,255,0.07)';
const LABEL_C = 'rgba(255,255,255,0.45)';
const LINE_COLOR = '#5b90d8';
const LINE_W = 1.5;
const AREA_A = 0.22;
const WIN_MS = 200_000;
const R_PAD = 0.30;
const MAX_RAW = 7000;
const DAMP = 6;
const SNAP_GAP = 3000;
const TRAIL_MARGIN_MS = 10_000;
const TRAIL_SAFETY = 30_000;
const Y_MS = 200;
const ZOOM_DAMP = 5;
const PULSE = 1500;
const DOT_R = 4;
const GLOW_R = 20;
const MIN_ZOOM_MS_DESKTOP = 100_000;
/** Узкий экран: можно сильнее приблизить (меньший минимальный диапазон по времени). */
const MIN_ZOOM_MS_NARROW = 48_000;
const MAX_ZOOM_MS = 400_000;
const TIME_H = 25;
const TIME_BG = '#05122a';
const CROSS_C = 'rgba(64,100,143,0.5)';
const CROSS_BG = '#40648f';
const PRICE_W = 60;
const INERTIA_FRICTION = 0.92;
const INERTIA_MIN = 0.02;
const EMA_A = 0.35;

// ─── Data structures ────────────────────────────────────────────────

function mkStore() {
  const pts: Point[] = [];
  function push(p: Point) {
    if (p.price <= 0 || p.time <= 0) return;
    const n = pts.length;
    if (n > 0) {
      const last = pts[n - 1];
      if (p.time === last.time) { last.price = p.price; return; }
      if (p.time < last.time) return;
      const gap = Math.floor(p.time / 1000) - Math.floor(last.time / 1000);
      if (gap > 1) { const f = Math.min(gap - 1, 120); for (let s = 1; s <= f; s++) { const t = last.time + s * 1000; if (t < p.time) pts.push({ time: t, price: last.price }); } }
    }
    pts.push(p);
    if (pts.length > MAX_RAW) pts.splice(0, pts.length - MAX_RAW);
  }
  return { push, pushMany(a: Point[]) { for (const p of a) push(p); }, all: () => pts, last: () => pts[pts.length - 1] ?? null, reset() { pts.length = 0; } };
}


function mkAnim() {
  let cp = 0, ct = 0, tp = 0, tt = 0, ok = false, _snapped = false;
  return {
    tick(p: number, t: number) { if (!ok) { cp = tp = p; ct = tt = t; ok = true; return; } tp = p; tt = t; },
    step() { _snapped = false; if (!ok) return; if (tt - ct > SNAP_GAP) { ct = tt; cp = tp; _snapped = true; return; } ct += (tt - ct) / DAMP; cp += (tp - cp) / DAMP; },
    snap(p: number, t: number) { cp = tp = p; ct = tt = t; ok = true; },
    get p() { return cp; }, get t() { return ct; }, get tp() { return tp; }, get ok() { return ok; }, get snapped() { return _snapped; },
    reset() { cp = ct = tp = tt = 0; ok = false; _snapped = false; },
  };
}

function mkVp() {
  const n = Date.now(), pad = WIN_MS * R_PAD;
  let ts = n + pad - WIN_MS, te = n + pad, af = true;
  let aw = Date.now(), ap = performance.now();
  let st: number | null = null, ls = 0;
  // Animated zoom targets
  let zts: number | null = null, zte: number | null = null;
  const wall = (pn: number) => aw + (pn - ap);
  const zoomLimits = { min: MIN_ZOOM_MS_DESKTOP, max: MAX_ZOOM_MS };
  const clampZoomWidth = (w: number) => Math.max(zoomLimits.min, Math.min(zoomLimits.max, w));
  let clampDataMin: number | null = null;
  let clampDataMax: number | null = null;
  return {
    setZoomLimits(minMs: number, maxMs?: number) {
      zoomLimits.min = minMs;
      if (maxMs !== undefined) zoomLimits.max = maxMs;
    },
    setDataClampRange(dMin: number | null, dMax: number | null) {
      clampDataMin = dMin;
      clampDataMax = dMax;
    },
    /** Как на свечном: минимум overlapRatio графика остаётся в пределах данных */
    applyDataClamp() {
      if (clampDataMin == null || clampDataMax == null) return;
      let dMin = clampDataMin;
      let dMax = clampDataMax;
      if (dMax <= dMin) dMax = dMin + 1;
      const { timeStart, timeEnd } = clampToDataBounds({
        timeStart: ts,
        timeEnd: te,
        dataTimeMin: dMin,
        dataTimeMax: dMax,
        overlapRatio: 0.1,
      });
      ts = timeStart;
      te = timeEnd;
    },
    get ts() { return ts; }, get te() { return te; }, get af() { return af; },
    cal(s: number) { const e = s - wall(performance.now()); if (Math.abs(e) > 50) aw += e * 0.3; },
    wall,
    adv(pn: number) {
      if (zts !== null && zte !== null) {
        const ds = zts - ts, de = zte - te;
        if (Math.abs(ds) < 1 && Math.abs(de) < 1) { ts = zts; te = zte; zts = null; zte = null; }
        else { ts += ds / ZOOM_DAMP; te += de / ZOOM_DAMP; return; }
      }
      if (!af) return;
      const w = te - ts, wn = wall(pn), p = w * R_PAD, ideal = wn + p;
      if (st === null) { st = ideal; ls = 0; }
      const sec = Math.floor(wn / 1000); if (ls === 0) ls = sec;
      if (sec > ls) { st += (sec - ls) * 1000; ls = sec; }
      const d = st - te; if (Math.abs(d) < 0.5) te = st; else te += d / DAMP; ts = te - w;
    },
    follow() { af = true; st = null; ls = 0; const wn = wall(performance.now()), w = te - ts, p = w * R_PAD; zts = wn + p - w; zte = wn + p; },
    set(s: number, e: number, f: boolean) { ts = s; te = e; af = f; st = null; ls = 0; zts = null; zte = null; },
    setAf(v: boolean) { af = v; if (!v) { st = null; ls = 0; } },
    zoom(f: number) { const w = te - ts, nw = clampZoomWidth(w / f); const m = (ts + te) / 2; zts = m - nw / 2; zte = m + nw / 2; af = false; st = null; ls = 0; },
    zoomAt(f: number, a: number) { const w = te - ts, nw = clampZoomWidth(w / f); const pv = ts + w * a; zts = pv - nw * a; zte = pv + nw * (1 - a); af = false; st = null; ls = 0; },
    pan(ms: number) { ts += ms; te += ms; af = false; st = null; ls = 0; zts = null; zte = null; },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function toY(p: number, mn: number, mx: number, h: number) { const r = mx - mn; return r === 0 ? h / 2 : h - ((p - mn) / r) * h; }
function lb(a: { time: number }[], t: number) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m].time < t) lo = m + 1; else hi = m; } return lo; }
function ub(a: { time: number }[], t: number) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m].time <= t) lo = m + 1; else hi = m; } return lo; }

function pRange(pts: { price: number; time: number }[], s: number, e: number, ex?: number) {
  const si = lb(pts, s), ei = ub(pts, e); let mn = Infinity, mx = -Infinity;
  for (let i = si; i < ei; i++) { if (pts[i].price < mn) mn = pts[i].price; if (pts[i].price > mx) mx = pts[i].price; }
  if (ex !== undefined && isFinite(ex)) { if (ex < mn) mn = ex; if (ex > mx) mx = ex; }
  if (!isFinite(mn)) return { min: 0, max: 1 };
  if (mn === mx) { mx += 0.1 * Math.abs(mx || 1); mn -= 0.1 * Math.abs(mn || 1); }
  const p = (mx - mn) * 0.15 || 1; return { min: mn - p, max: mx + p };
}

function easeO(t: number) { return t * (2 - t); }
function rgba(h: string, a: number) { return `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`; }

// ─── Grid & axes ────────────────────────────────────────────────────

const TIME_LABEL_MIN_PX = 70;
const TIME_STEPS = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000];

function calcTimeStep(range: number, w: number): number {
  const maxLabels = Math.floor(w / TIME_LABEL_MIN_PX);
  if (maxLabels <= 0) return range;
  const ideal = range / maxLabels;
  for (const s of TIME_STEPS) { if (s >= ideal) return s; }
  return TIME_STEPS[TIME_STEPS.length - 1];
}

function grid(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, e: number, mn: number, mx: number) {
  const ch = h - TIME_H;
  ctx.save();

  const tr = e - s;
  const step = calcTimeStep(tr, w);
  const ft = Math.ceil(s / step) * step;

  // vertical grid
  ctx.strokeStyle = GRID_C; ctx.lineWidth = 1;
  for (let t = ft; t < e; t += step) { const x = ((t - s) / tr) * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }

  // horizontal grid + price labels
  const pr = mx - mn;
  if (pr > 0) {
    const rp = pr / 6, mg = Math.pow(10, Math.floor(Math.log10(rp))), ns = [1, 2, 5, 10, 20, 50];
    let ps = mg; for (const n of ns) { if (n * mg >= rp * 0.7) { ps = n * mg; break; } }
    const fp = Math.ceil(mn / ps) * ps;
    ctx.font = `11px system-ui,-apple-system,"Segoe UI",sans-serif`; ctx.fillStyle = LABEL_C;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let p = fp; p < mx; p += ps) { const y = toY(p, mn, mx, ch); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - 60, y); ctx.stroke(); ctx.fillText(p.toFixed(5), w - 4, y); }
  }

  // time axis bar
  ctx.fillStyle = TIME_BG; ctx.fillRect(0, ch, w, TIME_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(0, ch); ctx.lineTo(w, ch); ctx.stroke();
  ctx.font = `11px system-ui,-apple-system,"Segoe UI",sans-serif`; ctx.fillStyle = LABEL_C;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (let t = ft; t < e; t += step) {
    const x = ((t - s) / tr) * w; if (x < 0 || x > w) continue;
    const d = new Date(t);
    const showSec = step < 60000;
    const lbl = showSec
      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    ctx.fillText(lbl, x, h - 8);
  }

  ctx.restore();
}

// ─── Path tracing ───────────────────────────────────────────────────

function collectCoords(pts: Point[], si: number, ei: number, live: Point | null, s: number, inv: number, w: number, mn: number, mx: number, h: number) {
  const coords: { x: number; y: number }[] = [];
  let prevX = -Infinity;
  for (let i = si; i < ei; i++) {
    const x = (pts[i].time - s) * inv * w, y = toY(pts[i].price, mn, mx, h);
    if (x >= prevX) { coords.push({ x, y }); prevX = x; }
  }
  if (live && live.time >= s) {
    const x = Math.min((live.time - s) * inv * w, w), y = toY(live.price, mn, mx, h);
    if (x >= prevX) coords.push({ x, y });
  }
  return coords;
}

function traceLine(ctx: CanvasRenderingContext2D, coords: { x: number; y: number }[]) {
  if (coords.length < 2) return;
  ctx.moveTo(coords[0].x, coords[0].y);
  for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y);
}

// ─── Watermark ──────────────────────────────────────────────────────

function fmtInstr(id: string) {
  let s = id, sfx = '';
  if (s.endsWith('_OTC')) { sfx = ' OTC'; s = s.slice(0, -4); }
  else if (s.endsWith('_REAL')) { s = s.slice(0, -5); }
  if (s.length === 6 && /^[A-Z]+$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}${sfx}`;
  return `${s}${sfx}`;
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number, inst: string | undefined) {
  if (!inst) return;
  const fs = Math.max(28, Math.min(48, w * 0.05));
  ctx.save();
  ctx.globalAlpha = 0.07; ctx.fillStyle = '#fff';
  ctx.font = `600 ${fs}px system-ui,-apple-system,"Segoe UI",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(fmtInstr(inst), w / 2, (h - TIME_H) / 2);
  ctx.restore();
}

// ─── Crosshair ──────────────────────────────────────────────────────

function crosshair(ctx: CanvasRenderingContext2D, mx: number, my: number, w: number, h: number, s: number, e: number, mn: number, mxP: number) {
  const ch = h - TIME_H;
  if (my < 0 || my > ch) return;

  const sx = Math.round(mx) + 0.5, sy = Math.round(my) + 0.5;
  ctx.save();
  ctx.strokeStyle = CROSS_C; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, ch); ctx.moveTo(0, sy); ctx.lineTo(w - PRICE_W, sy); ctx.stroke();

  const font = '600 12px system-ui,-apple-system,"Segoe UI",sans-serif';
  ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';

  // price label (right)
  const pr = mxP - mn, price = pr > 0 ? mn + (1 - my / ch) * pr : 0;
  const ptxt = price.toFixed(5);
  ctx.fillStyle = CROSS_BG;
  ctx.beginPath(); ctx.roundRect(w - PRICE_W, Math.max(0, sy - 13), PRICE_W, 26, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(ptxt, w - PRICE_W / 2, Math.max(13, sy));

  // time label (bottom)
  const tr = e - s, t = s + (mx / w) * tr;
  const d = new Date(t);
  const ttxt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  const tw = ctx.measureText(ttxt).width;
  const bw = tw + 12, bx = Math.max(2, Math.min(mx - bw / 2, w - bw - 2));
  ctx.fillStyle = CROSS_BG;
  ctx.beginPath(); ctx.roundRect(bx, ch, bw, TIME_H, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText(ttxt, bx + bw / 2, ch + TIME_H / 2);

  ctx.restore();
}

// ─── Chart render ───────────────────────────────────────────────────

function fmtCountdown(expiresAt: number): string {
  const rem = Math.max(0, expiresAt - Date.now()), ts = Math.floor(rem / 1000);
  return `${String(Math.floor(ts / 60)).padStart(2, '0')}:${String(ts % 60).padStart(2, '0')}`;
}

/** Вертикаль экспирации сделки + шахматный флажок (как useRenderLoop на свечах) */
function drawSessionExpiration(
  ctx: CanvasRenderingContext2D,
  expirationTime: number,
  ts: number,
  te: number,
  w: number,
  chartH: number,
) {
  const tr = te - ts;
  if (tr <= 0) return;
  const PRICE_LABEL_AREA_WIDTH = 60;
  const expirationX = ((expirationTime - ts) / tr) * w;
  const maxX = w - PRICE_LABEL_AREA_WIDTH;
  if (expirationX < 0 || expirationX > maxX) return;

  ctx.save();
  const CIRCLE_RADIUS = 18;
  const isMobile = w < 600;
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

  const cols = 5;
  const rows = 3;
  const flagWidth = CIRCLE_RADIUS * 1.1;
  const flagHeight = CIRCLE_RADIUS * 0.78;
  const flagX = circleX;
  const flagY = circleY;
  const cellW = flagWidth / cols;
  const cellH = flagHeight / rows;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.lineWidth = 0.5;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellX = flagX - flagWidth / 2 + col * cellW;
      const cellY = flagY - flagHeight / 2 + row * cellH;
      ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(cellX, cellY, cellW, cellH);
      ctx.strokeRect(cellX, cellY, cellW, cellH);
    }
  }

  ctx.strokeStyle = 'rgba(64, 100, 143, 0.5)';
  ctx.lineWidth = 2;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(expirationX, circleY + CIRCLE_RADIUS);
  ctx.lineTo(expirationX, chartH);
  ctx.stroke();

  ctx.restore();
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  live: Point | null,
  s: number,
  e: number,
  w: number,
  h: number,
  mn: number,
  mx: number,
  pn: number,
  trades: TradeOverlay[],
  payoutPct: number,
  expirationRenderTime: number | null,
) {
  const ch = h - TIME_H;
  const tr = e - s; if (tr <= 0) return; const inv = 1 / tr;
  const si = pts.length > 0 ? Math.max(0, lb(pts, s) - 1) : 0, ei = pts.length > 0 ? ub(pts, e) : 0;
  if (si >= ei && !live) return;

  const coords = collectCoords(pts, si, ei, live, s, inv, w, mn, mx, ch);
  if (coords.length < 1) return;
  const first = coords[0], last = coords[coords.length - 1];

  // area fill
  ctx.beginPath();
  traceLine(ctx, coords);
  ctx.lineTo(last.x, ch); ctx.lineTo(first.x, ch); ctx.closePath();
  let topY = Infinity; for (const c of coords) if (c.y < topY) topY = c.y;
  const tY = Math.max(0, Math.min(topY, ch));
  const g = ctx.createLinearGradient(0, tY, 0, ch);
  g.addColorStop(0, rgba(LINE_COLOR, AREA_A));
  g.addColorStop(0.6, rgba(LINE_COLOR, AREA_A * 0.4));
  g.addColorStop(1, rgba(LINE_COLOR, 0.01));
  ctx.fillStyle = g; ctx.fill();

  // line stroke
  ctx.beginPath(); ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = LINE_W; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  traceLine(ctx, coords);
  ctx.stroke();

  // pulsating dot at the tip
  const lx = last.x, ly = last.y;
  if (lx >= 0 && ly >= 0) {
    const raw = (pn % PULSE) / PULSE, tri = raw < 0.5 ? raw * 2 : 2 - raw * 2, av = 1 - Math.pow(1 - tri, 4);
    const gr = Math.max(DOT_R + 1, GLOW_R * av), ga = 0.6 * (1 - av);
    if (gr > DOT_R + 1) { const gd = ctx.createRadialGradient(lx, ly, DOT_R, lx, ly, gr); gd.addColorStop(0, `rgba(74,118,168,${ga})`); gd.addColorStop(0.5, `rgba(74,118,168,${ga * 0.4})`); gd.addColorStop(1, 'rgba(74,118,168,0)'); ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(lx, ly, gr, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#4a76a8'; ctx.beginPath(); ctx.arc(lx, ly, DOT_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(lx, ly, DOT_R * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  if (expirationRenderTime != null && Number.isFinite(expirationRenderTime)) {
    drawSessionExpiration(ctx, expirationRenderTime, s, e, w, ch);
  }

  // trade overlays
  const now_t = Date.now();
  const tr_r = e - s;
  const tToX = (t: number) => ((t - s) / tr_r) * w;

  // expiry vertical lines (behind everything)
  for (const t of trades) {
    if (t.result) continue;
    if (t.expiresAt < now_t - 500) continue;
    const tx = tToX(t.expiresAt);
    if (tx < 0 || tx > w - PRICE_W) continue;
    const isCall = t.direction === 'CALL';
    ctx.save();
    ctx.strokeStyle = isCall ? 'rgba(74,222,128,0.55)' : 'rgba(248,113,113,0.55)';
    ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx, ch); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = isCall ? '#4ade80' : '#f87171';
    ctx.beginPath(); ctx.arc(tx, 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // open trades
  for (const t of trades) {
    if (t.result) continue;
    if (t.expiresAt < now_t) continue;
    const openX = Math.max(0, Math.min(tToX(t.openedAt), w));
    const expX = Math.max(0, Math.min(tToX(t.expiresAt), w));
    const ey = Math.round(Math.max(5, Math.min(toY(t.entryPrice, mn, mx, ch), ch - 5))) + 0.5;
    if (Math.abs(expX - openX) < 1) continue;
    const isCall = t.direction === 'CALL';
    const lc = isCall ? '#45b833' : '#ff3d1f';
    ctx.save();
    ctx.strokeStyle = lc; ctx.lineWidth = 1.2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(openX, ey); ctx.lineTo(expX, ey); ctx.stroke();
    // entry dot
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(openX, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(openX, ey, 2.5, 0, Math.PI * 2); ctx.fill();
    // expiry label: countdown + payout
    const cdTxt = fmtCountdown(t.expiresAt);
    const totalPay = t.amount != null ? t.amount + (t.amount * payoutPct) / 100 : 0;
    const payTxt = t.amount != null ? `+${totalPay.toFixed(2)} USD` : '- USD';
    ctx.font = '10px system-ui,-apple-system,"Segoe UI",sans-serif';
    const l1w = ctx.measureText(cdTxt).width, l2w = ctx.measureText(payTxt).width;
    const lbW = Math.max(l1w, l2w) + 10, lbH = 26, pad = 4, maxLx = w - PRICE_W;
    const lbX = expX + pad + lbW <= maxLx ? expX + pad : Math.max(pad, expX - lbW - pad);
    const lbY = Math.max(0, Math.min(ey - lbH / 2, ch - lbH));
    ctx.fillStyle = lc; ctx.beginPath(); ctx.roundRect(lbX, lbY, lbW, lbH, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cdTxt, lbX + lbW / 2, lbY + 8);
    ctx.fillText(payTxt, lbX + lbW / 2, lbY + 18);
    ctx.restore();
  }

  // recently closed trade badges
  for (const t of trades) {
    if (!t.result || !t.closedAt) continue;
    const openX = Math.max(0, Math.min(tToX(t.openedAt), w));
    const ey = Math.round(Math.max(5, Math.min(toY(t.entryPrice, mn, mx, ch), ch - 5))) + 0.5;
    const isWin = t.result === 'WIN' || (t.pnl ?? 0) > 0;
    const isLoss = t.result === 'LOSS' || (t.pnl ?? 0) < 0;
    const bg = isWin ? '#45b833' : isLoss ? '#ff3d1f' : '#4b5563';
    const sign = (t.pnl ?? 0) > 0 ? '+$' : (t.pnl ?? 0) < 0 ? '-$' : '$';
    const amtTxt = `${sign}${Math.abs(t.pnl ?? 0).toFixed(0)}`;
    ctx.save();
    const BH = 28, BR = BH / 2, IS = 16, IP = 6, TPR = 10;
    ctx.font = 'bold 14px system-ui,-apple-system,"Segoe UI",sans-serif';
    const tw_b = ctx.measureText(amtTxt).width, BW = IS + IP + tw_b + TPR + IP;
    let bx = openX - BW / 2;
    if (bx + BW > w - PRICE_W) bx = w - PRICE_W - BW;
    if (bx < 4) bx = 4;
    const by = Math.max(4, ey - BH - 8);
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx, by, BW, BH, BR); ctx.fill();
    // icon circle
    const icx = bx + IP + IS / 2, icy = by + BH / 2, ir = IS / 2 - 1;
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(icx, icy, ir, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (isWin) { ctx.strokeStyle = '#45b833'; ctx.beginPath(); ctx.moveTo(icx - 3, icy); ctx.lineTo(icx - 0.5, icy + 3); ctx.lineTo(icx + 4, icy - 3); ctx.stroke(); }
    else if (isLoss) { ctx.strokeStyle = '#ff3d1f'; ctx.beginPath(); ctx.moveTo(icx - 3, icy - 3); ctx.lineTo(icx + 3, icy + 3); ctx.moveTo(icx + 3, icy - 3); ctx.lineTo(icx - 3, icy + 3); ctx.stroke(); }
    else { ctx.strokeStyle = '#4b5563'; ctx.beginPath(); ctx.moveTo(icx - 4, icy); ctx.lineTo(icx + 4, icy); ctx.stroke(); }
    // amount text
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui,-apple-system,"Segoe UI",sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(amtTxt, bx + IP + IS + IP, by + BH / 2);
    // connector line + dot
    ctx.strokeStyle = bg; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(openX, by + BH); ctx.lineTo(openX, ey - 4); ctx.stroke();
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(openX, ey, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(openX, ey, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // price line + label
  if (live && live.price > 0) {
    const py = toY(live.price, mn, mx, ch);
    ctx.save(); ctx.strokeStyle = 'rgba(91,144,216,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w - 60, py); ctx.stroke(); ctx.setLineDash([]);
    const txt = live.price.toFixed(5); ctx.font = '600 12px system-ui,-apple-system,"Segoe UI",sans-serif';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = '#3a6ba5'; ctx.beginPath(); ctx.roundRect(w - 60, py - 10, tw + 14, 20, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(txt, w - 53, py);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Public interface
// ═══════════════════════════════════════════════════════════════════════

interface LineChartProps {
  className?: string;
  style?: React.CSSProperties;
  instrument?: string;
  payoutPercent?: number;
  activeInstrumentRef?: React.MutableRefObject<string>;
  digits?: number;
  drawingMode?: string | null;
  indicatorConfigs?: IndicatorConfig[];
  overlayRegistry?: OverlayRegistryParams;
  onReady?: () => void;
}

export interface LineChartRef {
  reset: () => void;
  zoom: (factor: number) => void;
  pan: (deltaMs: number) => void;
  resetFollow: () => void;
  setExpirationSeconds: (seconds: number) => void;
  addTradeOverlayFromDTO: (trade: { id: string; direction: 'CALL' | 'PUT'; entryPrice: string; openedAt: string; expiresAt: string; amount?: string | number }) => void;
  removeTrade: (id: string) => void;
  removeDrawing: (id: string) => void;
  getDrawings: () => Drawing[];
  addDrawing: (drawing: Drawing) => void;
  clearDrawings: () => void;
  initializeFromSnapshot: (snapshot: { points: Array<{ time: number; price: number }>; currentPrice: number; serverTime: number }) => void;
  prependHistory: (points: Array<{ time: number; price: number }>) => void;
  setHoverAction: (action: 'CALL' | 'PUT' | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  shouldShowReturnToLatest: () => boolean;
  followLatest: () => void;
  handleTradeClose: (data: TradeClosePayload) => void;
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export const LineChart = forwardRef<LineChartRef, LineChartProps>(
  ({ className, style, instrument, payoutPercent: payoutPctProp, activeInstrumentRef, onReady }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const storeRef = useRef(mkStore());
    const animRef = useRef(mkAnim());
    const vpRef = useRef(mkVp());
    const trailRef = useRef<Point[]>([]);

    useEffect(() => {
      const mq = window.matchMedia('(max-width: 767px)');
      const apply = () => {
        vpRef.current.setZoomLimits(mq.matches ? MIN_ZOOM_MS_NARROW : MIN_ZOOM_MS_DESKTOP);
      };
      apply();
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }, []);
    const prevRef = useRef<Point | null>(null);
    const tradesRef = useRef<TradeOverlay[]>([]);
    const mouseRef = useRef<{ x: number; y: number } | null>(null);
    const payoutRef = useRef(payoutPctProp ?? 75);
    payoutRef.current = payoutPctProp ?? 75;

    const expirationSecRef = useRef(60);
    const expirationRenderRef = useRef<number | null>(null);
    const expirationTargetRef = useRef<number | null>(null);
    const expirationAnimStartRef = useRef<number | null>(null);
    const expirationAnimFromRef = useRef<number | null>(null);

    const yMn = useRef({ from: 0, to: 0, cur: 0, t0: 0 });
    const yMx = useRef({ from: 0, to: 1, cur: 1, t0: 0 });
    function setYv(a: typeof yMn.current, v: number, now: number) { if (Math.abs(a.to - v) < 1e-10) return; a.from = a.cur; a.to = v; a.t0 = now; }
    function tickYv(a: typeof yMn.current, now: number) { if (a.t0 === 0) { a.cur = a.to; return; } const p = Math.min(1, (now - a.t0) / Y_MS); a.cur = a.from + (a.to - a.from) * easeO(p); if (p >= 1) a.from = a.to; }

    const snapReady = useRef(false);
    const tickBuf = useRef<Point[]>([]);

    // pan inertia
    const panVel = useRef(0);
    const panActive = useRef(false);

    // return-to-follow timer
    const followTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scheduleFollow = useCallback(() => {
      if (followTimer.current) clearTimeout(followTimer.current);
      followTimer.current = setTimeout(() => { vpRef.current.follow(); }, 5000);
    }, []);
    const cancelFollow = useCallback(() => { if (followTimer.current) { clearTimeout(followTimer.current); followTimer.current = null; } }, []);

    const handleTick = useCallback((price: number, ts: number) => {
      if (!snapReady.current) { tickBuf.current.push({ time: ts, price }); return; }
      vpRef.current.cal(ts);
      storeRef.current.push({ time: ts, price });
      animRef.current.tick(price, ts);
    }, []);

    const handleServerTime = useCallback((ts: number) => { vpRef.current.cal(ts); }, []);

    // ── WebSocket ──
    useWebSocket({
      activeInstrumentRef,
      onPriceUpdate: handleTick,
      onServerTime: handleServerTime,
      onTradeOpen: (data) => showTradeOpenToast(data),
      onTradeClose: (data) => {
        const t = tradesRef.current.find(tr => tr.id === data.id);
        if (t) { t.result = data.result; t.closedAt = Date.now(); t.pnl = data.payout != null ? parseFloat(data.payout) : 0; setTimeout(() => { tradesRef.current = tradesRef.current.filter(tr => tr.id !== data.id); }, 5000); }
        dismissToastByKey(data.id);
        showTradeCloseToast(data);
      },
      enabled: true,
    });

    // ── Initialize from snapshot ──
    const doInit = useCallback((snap: { points: Point[]; currentPrice: number; serverTime: number }) => {
      const st = storeRef.current, an = animRef.current, vp = vpRef.current;
      st.reset(); an.reset(); trailRef.current = []; prevRef.current = null;
      if (snap.serverTime) vp.cal(snap.serverTime);
      st.pushMany(snap.points);
      const now = snap.serverTime || Date.now(), rp = WIN_MS * R_PAD;
      vp.set(now + rp - WIN_MS, now + rp, true);
      const lp = snap.points[snap.points.length - 1];
      if (lp) {
        an.snap(lp.price, lp.time);
        const r = pRange(snap.points, vp.ts, vp.te, lp.price);
        yMn.current = { from: r.min, to: r.min, cur: r.min, t0: 0 };
        yMx.current = { from: r.max, to: r.max, cur: r.max, t0: 0 };
      }
      snapReady.current = true;
      const buf = tickBuf.current; tickBuf.current = [];
      const cutoff = lp?.time ?? 0;
      for (const t of buf) { if (t.time > cutoff) { st.push(t); an.tick(t.price, t.time); } }
    }, []);

    // ── Snapshot load ──
    const loadingRef = useRef(false);
    const lastInstrRef = useRef<string | null>(null);
    useEffect(() => {
      if (!instrument) return;
      if (loadingRef.current || lastInstrRef.current === instrument) return;
      loadingRef.current = true; lastInstrRef.current = instrument;
      storeRef.current.reset(); animRef.current.reset();
      trailRef.current = []; prevRef.current = null; snapReady.current = false;
      (async () => {
        try {
          const snap = await api<{ points: Point[]; currentPrice: number; serverTime: number }>(`/api/line/snapshot?symbol=${instrument}`);
          doInit(snap); onReady?.();
        } catch (err) { logger.error('[LineChart] snapshot:', err); lastInstrRef.current = null; snapReady.current = true; }
        finally { loadingRef.current = false; }
      })();
    }, [instrument, doInit, onReady]);

    // ── History prepend ──
    const histLoading = useRef(false);
    const lastEdge = useRef(0);
    useEffect(() => {
      if (!instrument) return;
      const iv = setInterval(() => {
        if (histLoading.current) return;
        const vp = vpRef.current, pts = storeRef.current.all(), fp = pts[0];
        if (!fp) return;
        const range = vp.te - vp.ts, thr = range * 0.2;
        if (vp.ts - fp.time < thr && fp.time !== lastEdge.current) {
          histLoading.current = true; lastEdge.current = fp.time;
          (async () => {
            try {
              const { points } = await api<{ points: Point[] }>(`/api/line/history?symbol=${instrument}&to=${fp.time}&limit=300`);
              if (points.length > 0) { storeRef.current.pushMany(points.sort((a, b) => a.time - b.time)); }
            } catch { lastEdge.current = 0; }
            finally { histLoading.current = false; }
          })();
        }
      }, 500);
      return () => clearInterval(iv);
    }, [instrument]);

    // ── Ref methods ──
    useImperativeHandle(ref, () => ({
      reset() { storeRef.current.reset(); animRef.current.reset(); trailRef.current = []; prevRef.current = null; },
      zoom(f: number) { vpRef.current.zoom(f); },
      pan(ms: number) { vpRef.current.pan(ms); },
      resetFollow() { panActive.current = false; panVel.current = 0; vpRef.current.follow(); cancelFollow(); },
      setExpirationSeconds(sec: number) {
        if (!Number.isFinite(sec) || sec <= 0) return;
        expirationSecRef.current = sec;
      },
      addTradeOverlayFromDTO(t) {
        tradesRef.current = tradesRef.current.filter(x => x.id !== t.id);
        tradesRef.current.push({ id: t.id, direction: t.direction, entryPrice: parseFloat(t.entryPrice), openedAt: new Date(t.openedAt).getTime(), expiresAt: new Date(t.expiresAt).getTime(), amount: t.amount != null ? Number(t.amount) : undefined });
      },
      removeTrade(id) { tradesRef.current = tradesRef.current.filter(t => t.id !== id); },
      removeDrawing() {},
      getDrawings() { return []; },
      addDrawing() {},
      clearDrawings() {},
      initializeFromSnapshot(snap) { doInit(snap); },
      prependHistory(pts) { if (pts.length > 0) { storeRef.current.pushMany(pts.sort((a, b) => a.time - b.time)); } },
      setHoverAction() {},
      zoomIn() { vpRef.current.zoom(1.3); },
      zoomOut() { vpRef.current.zoom(0.77); },
      shouldShowReturnToLatest() {
        const vp = vpRef.current;
        if (vp.af) return false;
        const now = vp.wall(performance.now());
        const range = vp.te - vp.ts;
        return now - vp.te > range * 0.15;
      },
      followLatest() { panActive.current = false; panVel.current = 0; vpRef.current.follow(); cancelFollow(); },
      handleTradeClose(data) {
        const t = tradesRef.current.find(tr => tr.id === data.id);
        if (t) { t.result = data.result; t.closedAt = Date.now(); t.pnl = data.payout != null ? parseFloat(data.payout) : 0; setTimeout(() => { tradesRef.current = tradesRef.current.filter(tr => tr.id !== data.id); }, 5000); }
      },
    }));

    // ── Render loop ──
    useEffect(() => {
      const cvs = canvasRef.current; if (!cvs) return;
      let raf = 0, dpr = window.devicePixelRatio || 1, cw = 0, ch = 0, dirty = true;
      let lastInertiaT = 0;
      const ro = new ResizeObserver(() => { dirty = true; }); ro.observe(cvs);

      function frame(now: number) {
        const st = storeRef.current, an = animRef.current, vp = vpRef.current, trail = trailRef.current;

        // pan inertia (time-based friction, consistent across refresh rates)
        if (panActive.current) {
          const v = panVel.current;
          if (Math.abs(v) < INERTIA_MIN) { panActive.current = false; panVel.current = 0; lastInertiaT = 0; scheduleFollow(); }
          else {
            const dt = lastInertiaT > 0 ? Math.min(now - lastInertiaT, 32) : 16;
            lastInertiaT = now;
            const w = vp.te - vp.ts, pxMs = cw / w;
            vp.pan(-v * dt / pxMs);
            panVel.current *= Math.pow(INERTIA_FRICTION, dt / 16);
          }
        } else { lastInertiaT = 0; }

        vp.adv(now);

        const ctx = cvs!.getContext('2d');
        if (!ctx) { raf = requestAnimationFrame(frame); return; }
        if (dirty) { const r = cvs!.getBoundingClientRect(); cw = r.width; ch = r.height; dirty = false; }
        if (cw === 0 || ch === 0) { raf = requestAnimationFrame(frame); return; }
        const nd = window.devicePixelRatio || 1;
        if (nd !== dpr || cvs!.width !== Math.round(cw * nd) || cvs!.height !== Math.round(ch * nd)) { dpr = nd; cvs!.width = Math.round(cw * dpr); cvs!.height = Math.round(ch * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }

        const prev = prevRef.current;
        if (prev && prev.price > 0) trail.push({ time: prev.time, price: prev.price });
        // Prune trail by viewport: junction always stays off-screen
        { const tc = vp.ts - TRAIL_MARGIN_MS; let ci = 0; while (ci < trail.length && trail[ci].time < tc) ci++; if (ci > 0) trail.splice(0, ci); }
        if (trail.length > TRAIL_SAFETY) trail.splice(0, trail.length - TRAIL_SAFETY);

        an.step();
        if (an.snapped) { trail.length = 0; prevRef.current = null; }
        const ap = an.p, at = an.t;
        prevRef.current = ap > 0 ? { time: at, price: ap } : null;

        const raw = st.all();

        const combined: Point[] = [];
        const ts0 = trail.length > 0 ? trail[0].time : Infinity;
        for (let i = 0; i < raw.length; i++) { if (raw[i].time < ts0) combined.push(raw[i]); }
        for (let i = 0; i < trail.length; i++) combined.push(trail[i]);
        const live = ap > 0 ? { time: at, price: ap } : null;

        const wallNow = vp.wall(now);
        const arr = combined.length > 0 ? combined : raw;

        let dMin: number | null = null;
        let dMax: number | null = null;
        if (arr.length > 0) {
          dMin = arr[0].time;
          const lastH = arr[arr.length - 1].time;
          dMax = Math.max(wallNow, lastH, live?.time ?? 0);
        } else if (live) {
          dMin = live.time;
          dMax = Math.max(wallNow, live.time);
        }
        if (dMin != null && dMax != null) {
          let dm = dMin;
          let dx = dMax;
          if (dx <= dm) dx = dm + 1000;
          vp.setDataClampRange(dm, dx);
          vp.applyDataClamp();
        } else {
          vp.setDataClampRange(null, null);
        }

        const EXP_ANIM_MS = 320;
        let expirationDraw: number | null = null;
        if (expirationSecRef.current > 0 && (arr.length > 0 || live) && vp.te > vp.ts) {
          const lastT = arr.length > 0 ? arr[arr.length - 1].time : (live?.time ?? wallNow);
          const anchor = Math.max(wallNow, live?.time ?? 0, lastT);
          const rawExp = anchor + expirationSecRef.current * 1000;
          const curT = expirationTargetRef.current;
          const curR = expirationRenderRef.current;
          if (curR == null || curT == null) {
            expirationRenderRef.current = rawExp;
            expirationTargetRef.current = rawExp;
            expirationAnimStartRef.current = null;
            expirationAnimFromRef.current = null;
          } else {
            const delta = Math.abs(rawExp - curT);
            if (delta > 1500 && rawExp !== curT) {
              expirationTargetRef.current = rawExp;
              expirationAnimStartRef.current = now;
              expirationAnimFromRef.current = curR;
            }
            const a0 = expirationAnimStartRef.current;
            const v0 = expirationAnimFromRef.current;
            const tgtExp = expirationTargetRef.current ?? rawExp;
            if (a0 != null && v0 != null) {
              const elapsed = now - a0;
              const p = Math.min(1, Math.max(0, elapsed / EXP_ANIM_MS));
              const tt = p ** 3 * (p * (6 * p - 15) + 10);
              expirationRenderRef.current = v0 + (tgtExp - v0) * tt;
            } else {
              expirationRenderRef.current = tgtExp;
            }
          }
          expirationDraw = expirationRenderRef.current;
        } else {
          expirationRenderRef.current = null;
          expirationTargetRef.current = null;
          expirationAnimStartRef.current = null;
          expirationAnimFromRef.current = null;
        }

        const tgt = an.tp;
        const r = pRange(combined.length > 0 ? combined : raw, vp.ts, vp.te, tgt > 0 ? tgt : undefined);
        setYv(yMn.current, r.min, now); setYv(yMx.current, r.max, now);
        tickYv(yMn.current, now); tickYv(yMx.current, now);

        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch);

        watermark(ctx, cw, ch, instrument);

        if (combined.length > 0 || live) {
          grid(ctx, cw, ch, vp.ts, vp.te, yMn.current.cur, yMx.current.cur);
          drawChart(ctx, combined, live, vp.ts, vp.te, cw, ch, yMn.current.cur, yMx.current.cur, now, tradesRef.current, payoutRef.current, expirationDraw);
        }

        const m = mouseRef.current;
        if (m) crosshair(ctx, m.x, m.y, cw, ch, vp.ts, vp.te, yMn.current.cur, yMx.current.cur);

        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, [scheduleFollow, instrument]);

    // ── Events (zoom, pan, touch) ──
    useEffect(() => {
      const cvs = canvasRef.current; if (!cvs) return;
      const isPanning = { v: false }; let lastX = 0; let lastTime = 0; let emaV = 0;

      const onWheel = (e: WheelEvent) => { e.preventDefault(); panActive.current = false; panVel.current = 0; const rect = cvs.getBoundingClientRect(); const a = (e.clientX - rect.left) / rect.width; vpRef.current.zoomAt(e.deltaY < 0 ? 1.15 : 0.87, a); };
      const onDown = (e: MouseEvent) => {
        if (e.button !== 0) return; e.preventDefault(); cancelFollow(); panActive.current = false; panVel.current = 0; emaV = 0; lastTime = performance.now();
        isPanning.v = true; lastX = e.clientX - cvs.getBoundingClientRect().left; cvs.style.cursor = 'grabbing';
      };
      const onHover = (e: MouseEvent) => { const rect = cvs.getBoundingClientRect(); mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }; };
      const onMove = (e: MouseEvent) => {
        if (!isPanning.v) return;
        const rect = cvs.getBoundingClientRect(); const cx = e.clientX - rect.left;
        mouseRef.current = { x: cx, y: e.clientY - rect.top };
        const dx = cx - lastX;
        const now = performance.now(); if (lastTime) { const dt = now - lastTime; if (dt > 0) { emaV = EMA_A * (dx / dt) + (1 - EMA_A) * emaV; panVel.current = emaV; } } lastTime = now;
        const vp = vpRef.current, w = rect.width, tr = vp.te - vp.ts; vp.pan(-dx / (w / tr)); lastX = cx;
      };
      const finishPan = () => { if (Math.abs(panVel.current) > INERTIA_MIN) { panActive.current = true; vpRef.current.setAf(false); } else { panActive.current = false; panVel.current = 0; scheduleFollow(); } };
      const onUp = () => { if (isPanning.v) finishPan(); isPanning.v = false; cvs.style.cursor = ''; };
      const onLeave = () => { if (isPanning.v) finishPan(); isPanning.v = false; cvs.style.cursor = ''; mouseRef.current = null; };
      const onDbl = () => { panActive.current = false; panVel.current = 0; vpRef.current.follow(); cancelFollow(); };

      // Touch
      let touchMode: 'none' | 'pan' | 'pinch' = 'none';
      let touchStart = { x: 0, y: 0 };
      let pinchDist = 0;
      const dist = (a: Touch, b: Touch) => Math.sqrt((a.clientX - b.clientX) ** 2 + (a.clientY - b.clientY) ** 2);

      const onTS = (e: TouchEvent) => {
        e.preventDefault(); cancelFollow();
        if (e.touches.length === 1) { touchMode = 'pan'; touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; panActive.current = false; panVel.current = 0; emaV = 0; lastTime = performance.now(); }
        else if (e.touches.length === 2) { touchMode = 'pinch'; pinchDist = dist(e.touches[0], e.touches[1]); panActive.current = false; }
      };
      const onTM = (e: TouchEvent) => {
        e.preventDefault();
        if (touchMode === 'pan' && e.touches.length === 1) {
          const t = e.touches[0], dx = t.clientX - touchStart.x;
          const rect = cvs.getBoundingClientRect(), vp = vpRef.current, tr = vp.te - vp.ts; vp.pan(-dx / (rect.width / tr));
          const now = performance.now(); if (lastTime) { const dt = now - lastTime; if (dt > 0) { emaV = EMA_A * (dx / dt) + (1 - EMA_A) * emaV; panVel.current = emaV; } } lastTime = now;
          touchStart = { x: t.clientX, y: t.clientY };
        } else if (touchMode === 'pinch' && e.touches.length === 2) {
          const nd = dist(e.touches[0], e.touches[1]); const f = nd / pinchDist;
          const rect = cvs.getBoundingClientRect(); const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width;
          vpRef.current.zoomAt(f, Math.max(0, Math.min(1, cx))); pinchDist = nd;
        }
      };
      const onTE = () => { if (touchMode === 'pan') finishPan(); else if (touchMode === 'pinch') scheduleFollow(); touchMode = 'none'; };

      cvs.addEventListener('wheel', onWheel, { passive: false });
      cvs.addEventListener('mousedown', onDown);
      cvs.addEventListener('mousemove', onHover);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      cvs.addEventListener('mouseleave', onLeave);
      cvs.addEventListener('dblclick', onDbl);
      cvs.addEventListener('touchstart', onTS, { passive: false });
      cvs.addEventListener('touchmove', onTM, { passive: false });
      cvs.addEventListener('touchend', onTE);
      cvs.addEventListener('touchcancel', onTE);

      return () => {
        cvs.removeEventListener('wheel', onWheel);
        cvs.removeEventListener('mousedown', onDown);
        cvs.removeEventListener('mousemove', onHover);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        cvs.removeEventListener('mouseleave', onLeave);
        cvs.removeEventListener('dblclick', onDbl);
        cvs.removeEventListener('touchstart', onTS);
        cvs.removeEventListener('touchmove', onTM);
        cvs.removeEventListener('touchend', onTE);
        cvs.removeEventListener('touchcancel', onTE);
      };
    }, [cancelFollow, scheduleFollow]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ ...style, width: '100%', height: '100%', display: 'block', cursor: 'default', touchAction: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      />
    );
  }
);

LineChart.displayName = 'LineChart';
