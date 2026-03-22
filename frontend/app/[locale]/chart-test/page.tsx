'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api/api';

// ═══════════════════════════════════════════════════════════════════════
// PURE LINE CHART - "Committed Trail" architecture
// Standalone page with its own WebSocket - no shared hook dependencies.
// ═══════════════════════════════════════════════════════════════════════

interface Point { time: number; price: number; }
interface ReducedPoint { time: number; price: number; min: number; max: number; }

const LINE_COLOR = '#5b90d8';
const LINE_WIDTH = 2;
const AREA_ALPHA = 0.22;

const DEFAULT_WINDOW_MS = 420_000;
const RIGHT_PADDING = 0.30;
const MAX_RAW = 7000;
const PX_PER_BUCKET = 5;
const MIN_INTERVAL = 1000;
const DAMPING = 6;
const SNAP_GAP = 3000;
const MAX_TRAIL = 2000;
const Y_ANIM_MS = 200;

const PULSE_MS = 1500;
const DOT_R = 4;
const GLOW_R = 20;
const INSTRUMENT = 'EURUSD_OTC';

// ─── Point Store ────────────────────────────────────────────────────

function createStore() {
  const pts: Point[] = [];
  function push(p: Point) {
    if (p.price <= 0 || p.time <= 0) return;
    const n = pts.length;
    if (n > 0) {
      const last = pts[n - 1];
      if (p.time === last.time) { last.price = p.price; return; }
      if (p.time < last.time) return;
      const gapSec = Math.floor(p.time / 1000) - Math.floor(last.time / 1000);
      if (gapSec > 1) {
        const fill = Math.min(gapSec - 1, 120);
        for (let s = 1; s <= fill; s++) {
          const t = last.time + s * 1000;
          if (t < p.time) pts.push({ time: t, price: last.price });
        }
      }
    }
    pts.push(p);
    if (pts.length > MAX_RAW) pts.splice(0, pts.length - MAX_RAW);
  }
  return {
    push,
    pushMany(arr: Point[]) { for (const a of arr) push(a); },
    all: () => pts,
    last: () => pts.length > 0 ? pts[pts.length - 1] : null,
    reset() { pts.length = 0; },
  };
}

// ─── Reduction (close-price buckets) ────────────────────────────────

function createReduction() {
  let red: ReducedPoint[] = [];
  let interval = MIN_INTERVAL;

  function recalc(pts: Point[], int: number) {
    interval = int;
    if (pts.length === 0) { red = []; return; }
    const r: ReducedPoint[] = [];
    let bs = Math.floor(pts[0].time / int) * int;
    let be = bs + int;
    let cnt = 0, mn = Infinity, mx = -Infinity, cl = 0;
    for (const p of pts) {
      while (p.time >= be) {
        if (cnt > 0) r.push({ time: bs, price: cl, min: mn, max: mx });
        bs = be; be = bs + int; cnt = 0; mn = Infinity; mx = -Infinity;
      }
      cl = p.price; cnt++;
      if (p.price < mn) mn = p.price;
      if (p.price > mx) mx = p.price;
    }
    if (cnt > 0) r.push({ time: bs, price: cl, min: mn, max: mx });
    red = r;
  }

  function bestInterval(tFrom: number, tTo: number, wPx: number) {
    const range = tTo - tFrom;
    if (range <= 0 || wPx <= 0) return interval;
    return Math.max(MIN_INTERVAL, Math.floor(range / (wPx / PX_PER_BUCKET)));
  }

  function update(pts: Point[], tFrom: number, tTo: number, wPx: number) {
    const ni = bestInterval(tFrom, tTo, wPx);
    if (ni !== interval || red.length === 0) recalc(pts, ni);
  }

  function pushTick(tick: Point) {
    if (interval <= 0) return;
    const bs = Math.floor(tick.time / interval) * interval;
    if (red.length > 0) {
      const last = red[red.length - 1];
      if (last.time === bs) {
        last.price = tick.price;
        if (tick.price < last.min) last.min = tick.price;
        if (tick.price > last.max) last.max = tick.price;
        return;
      }
    }
    red.push({ time: bs, price: tick.price, min: tick.price, max: tick.price });
  }

  return {
    update, pushTick,
    get: () => red,
    interval: () => interval,
    reset() { red = []; interval = MIN_INTERVAL; },
  };
}

// ─── Animator (1/6 damping) ─────────────────────────────────────────

function createAnimator() {
  let cp = 0, ct = 0, tp = 0, tt = 0, ok = false;
  return {
    onTick(p: number, t: number) {
      if (!ok) { cp = tp = p; ct = tt = t; ok = true; return; }
      tp = p; tt = t;
    },
    update() {
      if (!ok) return;
      if (tt - ct > SNAP_GAP) { ct = tt; cp = tp; return; }
      ct += (tt - ct) / DAMPING;
      cp += (tp - cp) / DAMPING;
    },
    snap(p: number, t: number) { cp = tp = p; ct = tt = t; ok = true; },
    get price() { return cp; },
    get time() { return ct; },
    get target() { return tp; },
    get ready() { return ok; },
    reset() { cp = ct = tp = tt = 0; ok = false; },
  };
}

// ─── Viewport ───────────────────────────────────────────────────────

function createViewport() {
  const n = Date.now();
  const pad = DEFAULT_WINDOW_MS * RIGHT_PADDING;
  let ts = n + pad - DEFAULT_WINDOW_MS, te = n + pad;
  let follow = true;
  let aWall = Date.now(), aPerf = performance.now();
  let scrollTgt: number | null = null, lastSec = 0;
  const wall = (pn: number) => aWall + (pn - aPerf);
  return {
    get ts() { return ts; }, get te() { return te; }, get follow() { return follow; },
    calibrate(st: number) {
      const err = st - wall(performance.now());
      if (Math.abs(err) > 50) aWall += err * 0.3;
    },
    wall,
    advance(pn: number) {
      if (!follow) return;
      const w = te - ts;
      const wn = wall(pn);
      const p = w * RIGHT_PADDING;
      const ideal = wn + p;
      if (scrollTgt === null) { scrollTgt = ideal; te = ideal; ts = ideal - w; return; }
      const sec = Math.floor(wn / 1000);
      if (lastSec === 0) lastSec = sec;
      if (sec > lastSec) { scrollTgt += (sec - lastSec) * 1000; lastSec = sec; }
      const d = scrollTgt - te;
      if (Math.abs(d) < 0.5) te = scrollTgt; else te += d / DAMPING;
      ts = te - w;
    },
    resetFollow() {
      const wn = wall(performance.now());
      const w = te - ts; const p = w * RIGHT_PADDING;
      te = wn + p; ts = te - w; follow = true; scrollTgt = null; lastSec = 0;
    },
    set(s: number, e: number, f: boolean) {
      ts = s; te = e; follow = f; scrollTgt = null; lastSec = 0;
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function toY(p: number, mn: number, mx: number, h: number) {
  const r = mx - mn; return r === 0 ? h / 2 : h - ((p - mn) / r) * h;
}
function lb(a: { time: number }[], t: number) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m].time < t) lo = m + 1; else hi = m; }
  return lo;
}
function ub(a: { time: number }[], t: number) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (a[m].time <= t) lo = m + 1; else hi = m; }
  return lo;
}
function priceRange(pts: { price: number; time: number }[], s: number, e: number, extra?: number) {
  const si = lb(pts, s), ei = ub(pts, e);
  let mn = Infinity, mx = -Infinity;
  for (let i = si; i < ei; i++) { if (pts[i].price < mn) mn = pts[i].price; if (pts[i].price > mx) mx = pts[i].price; }
  if (extra !== undefined && isFinite(extra)) { if (extra < mn) mn = extra; if (extra > mx) mx = extra; }
  if (!isFinite(mn)) return { min: 0, max: 1 };
  if (mn === mx) { mx += 0.1 * Math.abs(mx || 1); mn -= 0.1 * Math.abs(mn || 1); }
  const p = (mx - mn) * 0.15 || 1;
  return { min: mn - p, max: mx + p };
}
function easeOut(t: number) { return t * (2 - t); }
function rgba(hex: string, a: number) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}

// ─── Grid ───────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number,
  s: number, e: number, mn: number, mx: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  const tr = e - s;
  const steps = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000];
  const raw = tr / 8;
  let step = steps[0];
  for (const st of steps) { if (st >= raw * 0.7) { step = st; break; } }
  const ft = Math.ceil(s / step) * step;
  ctx.textBaseline = 'top';
  for (let t = ft; t < e; t += step) {
    const x = ((t - s) / tr) * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h - 25); ctx.stroke();
    const d = new Date(t);
    ctx.fillText(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`, x - 20, h - 18);
  }
  const pr = mx - mn;
  if (pr > 0) {
    const rp = pr / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rp)));
    const ns = [1, 2, 5, 10, 20, 50];
    let ps = mag;
    for (const n of ns) { if (n * mag >= rp * 0.7) { ps = n * mag; break; } }
    const fp = Math.ceil(mn / ps) * ps;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
    for (let p = fp; p < mx; p += ps) {
      const y = toY(p, mn, mx, h);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w - 60, y); ctx.stroke();
      ctx.fillText(p.toFixed(5), w - 4, y);
    }
  }
  ctx.restore();
}

// ─── Main draw ──────────────────────────────────────────────────────

function draw(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  live: Point | null,
  s: number, e: number,
  w: number, h: number,
  mn: number, mx: number,
  pn: number,
) {
  const tr = e - s;
  if (tr <= 0) return;
  const inv = 1 / tr;

  const si = pts.length > 0 ? Math.max(0, lb(pts, s) - 1) : 0;
  const ei = pts.length > 0 ? ub(pts, e) : 0;
  if (si >= ei && !live) return;

  ctx.beginPath();
  let fx = 0, lx = 0, ly = 0, go = false, topY = Infinity;
  for (let i = si; i < ei; i++) {
    const x = (pts[i].time - s) * inv * w;
    const y = toY(pts[i].price, mn, mx, h);
    if (y < topY) topY = y;
    if (!go) { ctx.moveTo(x, y); fx = x; go = true; }
    else ctx.lineTo(x, y);
    lx = x; ly = y;
  }
  if (live && live.time >= s) {
    const x = Math.min((live.time - s) * inv * w, w);
    const y = toY(live.price, mn, mx, h);
    if (!go) { ctx.moveTo(x, y); fx = x; go = true; }
    else if (x >= lx) { ctx.lineTo(x, y); }
    lx = x; ly = y;
    if (y < topY) topY = y;
  }
  if (go) {
    ctx.lineTo(lx, h); ctx.lineTo(fx, h); ctx.closePath();
    const tY = Math.max(0, Math.min(topY, h));
    const g = ctx.createLinearGradient(0, tY, 0, h);
    g.addColorStop(0, rgba(LINE_COLOR, AREA_ALPHA));
    g.addColorStop(0.6, rgba(LINE_COLOR, AREA_ALPHA * 0.4));
    g.addColorStop(1, rgba(LINE_COLOR, 0.01));
    ctx.fillStyle = g; ctx.fill();
  }

  ctx.beginPath();
  ctx.strokeStyle = LINE_COLOR; ctx.lineWidth = LINE_WIDTH;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  go = false; lx = 0; ly = 0;
  for (let i = si; i < ei; i++) {
    const x = (pts[i].time - s) * inv * w;
    const y = toY(pts[i].price, mn, mx, h);
    if (!go) { ctx.moveTo(x, y); go = true; }
    else ctx.lineTo(x, y);
    lx = x; ly = y;
  }
  if (live && live.time >= s) {
    const x = Math.min((live.time - s) * inv * w, w);
    const y = toY(live.price, mn, mx, h);
    if (!go) { ctx.moveTo(x, y); go = true; }
    else if (x >= lx) { ctx.lineTo(x, y); }
    lx = x; ly = y;
  }
  ctx.stroke();

  if (go && lx >= 0 && ly >= 0) {
    const raw = (pn % PULSE_MS) / PULSE_MS;
    const tri = raw < 0.5 ? raw * 2 : 2 - raw * 2;
    const av = 1 - Math.pow(1 - tri, 4);
    const gr = Math.max(DOT_R + 1, GLOW_R * av);
    const ga = 0.6 * (1 - av);
    if (gr > DOT_R + 1) {
      const gd = ctx.createRadialGradient(lx, ly, DOT_R, lx, ly, gr);
      gd.addColorStop(0, `rgba(74,118,168,${ga})`);
      gd.addColorStop(0.5, `rgba(74,118,168,${ga * 0.4})`);
      gd.addColorStop(1, 'rgba(74,118,168,0)');
      ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(lx, ly, gr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#4a76a8'; ctx.beginPath(); ctx.arc(lx, ly, DOT_R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(lx, ly, DOT_R * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  if (live && live.price > 0) {
    const py = toY(live.price, mn, mx, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(91,144,216,0.5)'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w - 60, py); ctx.stroke();
    ctx.setLineDash([]);
    const txt = live.price.toFixed(5);
    ctx.font = '11px system-ui, sans-serif';
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = '#3a6ba5';
    ctx.beginPath(); ctx.roundRect(w - 60, py - 10, tw + 14, 20, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, w - 53, py);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// React component - standalone WebSocket
// ═══════════════════════════════════════════════════════════════════════

export default function ChartTestPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  const storeRef = useRef(createStore());
  const redRef = useRef(createReduction());
  const animRef = useRef(createAnimator());
  const vpRef = useRef(createViewport());

  const trailRef = useRef<Point[]>([]);
  const prevAnimRef = useRef<Point | null>(null);

  const yMin = useRef({ from: 0, to: 0, cur: 0, t0: 0 });
  const yMax = useRef({ from: 0, to: 1, cur: 1, t0: 0 });
  function setYA(a: typeof yMin.current, v: number, now: number) {
    if (Math.abs(a.to - v) < 1e-10) return;
    a.from = a.cur; a.to = v; a.t0 = now;
  }
  function tickYA(a: typeof yMin.current, now: number) {
    if (a.t0 === 0) { a.cur = a.to; return; }
    const p = Math.min(1, (now - a.t0) / Y_ANIM_MS);
    a.cur = a.from + (a.to - a.from) * easeOut(p);
    if (p >= 1) a.from = a.to;
  }

  const snapReady = useRef(false);
  const tickBuf = useRef<Point[]>([]);

  // Debug state
  const [wsStatus, setWsStatus] = useState('idle');
  const [tickCount, setTickCount] = useState(0);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [lastMsgTypes, setLastMsgTypes] = useState<string[]>([]);
  const tickCountRef = useRef(0);
  const msgTypesRef = useRef<string[]>([]);

  const addMsgType = useCallback((t: string) => {
    msgTypesRef.current = [...msgTypesRef.current.slice(-9), t];
    setLastMsgTypes([...msgTypesRef.current]);
  }, []);

  const processTick = useCallback((price: number, ts: number) => {
    tickCountRef.current++;
    if (tickCountRef.current % 5 === 0) setTickCount(tickCountRef.current);

    if (!snapReady.current) {
      tickBuf.current.push({ time: ts, price });
      if (tickBuf.current.length >= 3) {
        snapReady.current = true;
        vpRef.current.calibrate(ts);
        const buf = tickBuf.current; tickBuf.current = [];
        for (const t of buf) {
          storeRef.current.push(t);
          redRef.current.pushTick(t);
          animRef.current.onTick(t.price, t.time);
        }
        setReady(true);
      }
      return;
    }
    vpRef.current.calibrate(ts);
    storeRef.current.push({ time: ts, price });
    redRef.current.pushTick({ time: ts, price });
    animRef.current.onTick(price, ts);
  }, []);

  // ── Standalone WebSocket ──
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingInterval: ReturnType<typeof setInterval> | null = null;
    let dead = false;

    const wsBase = window.location.hostname === 'localhost' && window.location.port === '3000'
      ? 'ws://localhost:3001'
      : window.location.origin.replace(/^http/, 'ws');
    const wsUrl = wsBase + '/ws';

    function connect() {
      if (dead) return;
      setWsStatus('connecting: ' + wsUrl);
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        setWsStatus('connected, waiting ws:ready');
        pingInterval = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        }, 30000);
      };

      ws.onmessage = (ev) => {
        // Binary price tick
        if (ev.data instanceof ArrayBuffer) {
          const buf = ev.data as ArrayBuffer;
          if (buf.byteLength < 2) return;
          const view = new DataView(buf);
          const msgType = view.getUint8(0);
          if (msgType !== 0x01) { addMsgType('bin:unknown'); return; }
          const instrLen = view.getUint8(1);
          if (instrLen === 0 || buf.byteLength < 2 + instrLen + 16) return;
          const instrBytes = new Uint8Array(buf, 2, instrLen);
          let instr = '';
          for (let i = 0; i < instrLen; i++) instr += String.fromCharCode(instrBytes[i]);
          const price = view.getFloat64(2 + instrLen);
          const timestamp = view.getFloat64(2 + instrLen + 8);
          if (!Number.isFinite(price) || !Number.isFinite(timestamp) || price <= 0) return;
          addMsgType('bin:price');
          if (instr === INSTRUMENT) processTick(price, timestamp);
          return;
        }

        // JSON
        try {
          const msg = JSON.parse(ev.data as string);
          addMsgType(msg.type || 'unknown');

          if (msg.type === 'ws:ready') {
            setWsStatus('ready, subscribing...');
            ws?.send(JSON.stringify({ type: 'subscribe', instrument: INSTRUMENT }));
            return;
          }

          if (msg.type === 'subscribed') {
            setWsStatus('subscribed: ' + msg.instrument);
            return;
          }

          if (msg.type === 'server:time' && msg.data?.timestamp) {
            vpRef.current.calibrate(msg.data.timestamp);
            return;
          }

          if (msg.type === 'price:update' && msg.data) {
            const { price, timestamp, asset } = msg.data;
            if (asset === INSTRUMENT || msg.instrument === INSTRUMENT) {
              processTick(price, timestamp);
            }
            return;
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => setWsStatus('error');
      ws.onclose = (ev) => {
        setWsStatus(`closed (${ev.code})`);
        if (pingInterval) clearInterval(pingInterval);
        if (!dead) setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      dead = true;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) {
        try { ws.send(JSON.stringify({ type: 'unsubscribe_all' })); } catch { /* */ }
        ws.close();
      }
    };
  }, [processTick, addMsgType]);

  // ── Load snapshot ──
  useEffect(() => {
    (async () => {
      try {
        const snap = await api<{ points: Point[]; currentPrice: number; serverTime: number }>
          (`/api/line/snapshot?symbol=${INSTRUMENT}`);

        const st = storeRef.current; const rd = redRef.current;
        const an = animRef.current; const vp = vpRef.current;
        st.reset(); rd.reset(); an.reset();
        trailRef.current = []; prevAnimRef.current = null;

        if (snap.serverTime) vp.calibrate(snap.serverTime);
        st.pushMany(snap.points);

        const now = snap.serverTime || Date.now();
        const rp = DEFAULT_WINDOW_MS * RIGHT_PADDING;
        vp.set(now + rp - DEFAULT_WINDOW_MS, now + rp, true);

        const lp = snap.points[snap.points.length - 1];
        if (lp) {
          an.snap(lp.price, lp.time);
          const r = priceRange(snap.points, vp.ts, vp.te, lp.price);
          yMin.current = { from: r.min, to: r.min, cur: r.min, t0: 0 };
          yMax.current = { from: r.max, to: r.max, cur: r.max, t0: 0 };
        }

        snapReady.current = true;
        const buf = tickBuf.current; tickBuf.current = [];
        const cutoff = lp?.time ?? 0;
        for (const t of buf) {
          if (t.time > cutoff) { st.push(t); rd.pushTick(t); an.onTick(t.price, t.time); }
        }
        setReady(true);
      } catch (err) {
        console.error('[chart-test] snapshot error:', err);
        setSnapError(String(err instanceof Error ? err.message : err));
      }
    })();
  }, []);

  // ── Render loop ──
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    let raf = 0, dpr = window.devicePixelRatio || 1, cw = 0, ch = 0, dirty = true;
    const ro = new ResizeObserver(() => { dirty = true; }); ro.observe(cvs);

    function frame(now: number) {
      const st = storeRef.current;
      const rd = redRef.current;
      const an = animRef.current;
      const vp = vpRef.current;
      const trail = trailRef.current;

      vp.advance(now);

      const ctx = cvs!.getContext('2d');
      if (!ctx) { raf = requestAnimationFrame(frame); return; }
      if (dirty) { const r = cvs!.getBoundingClientRect(); cw = r.width; ch = r.height; dirty = false; }
      if (cw === 0 || ch === 0) { raf = requestAnimationFrame(frame); return; }
      const nd = window.devicePixelRatio || 1;
      if (nd !== dpr || cvs!.width !== Math.round(cw * nd) || cvs!.height !== Math.round(ch * nd)) {
        dpr = nd; cvs!.width = Math.round(cw * dpr); cvs!.height = Math.round(ch * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const prev = prevAnimRef.current;
      if (prev && prev.price > 0) {
        trail.push({ time: prev.time, price: prev.price });
        if (trail.length > MAX_TRAIL) trail.splice(0, trail.length - MAX_TRAIL);
      }

      an.update();
      const ap = an.price, at = an.time;
      prevAnimRef.current = ap > 0 ? { time: at, price: ap } : null;

      const raw = st.all();
      rd.update(raw, vp.ts, vp.te, cw);
      const allRed = rd.get();

      let display = allRed;
      if (ap > 0 && allRed.length > 1 && raw.length > 0) {
        const intv = rd.interval();
        const lastRawT = raw[raw.length - 1].time;
        const activeBucket = Math.floor(lastRawT / intv) * intv;
        if (allRed[allRed.length - 1].time >= activeBucket) {
          display = allRed.slice(0, -1);
        }
      }

      const combined: Point[] = [];
      const trailStart = trail.length > 0 ? trail[0].time : Infinity;
      for (let i = 0; i < display.length; i++) {
        if (display[i].time < trailStart) combined.push(display[i]);
      }
      for (let i = 0; i < trail.length; i++) combined.push(trail[i]);

      const live = ap > 0 ? { time: at, price: ap } : null;

      const tgt = an.target;
      const r = priceRange(combined.length > 0 ? combined : display, vp.ts, vp.te, tgt > 0 ? tgt : undefined);
      setYA(yMin.current, r.min, now);
      setYA(yMax.current, r.max, now);
      tickYA(yMin.current, now); tickYA(yMax.current, now);

      ctx.clearRect(0, 0, cw, ch);
      ctx.fillStyle = '#1a1f2e'; ctx.fillRect(0, 0, cw, ch);

      if (combined.length > 0 || live) {
        drawGrid(ctx, cw, ch, vp.ts, vp.te, yMin.current.cur, yMax.current.cur);
        draw(ctx, combined, live, vp.ts, vp.te, cw, ch, yMin.current.cur, yMax.current.cur, now);
      } else {
        ctx.fillStyle = '#888'; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Ожидание данных...', cw / 2, ch / 2);
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1f2e', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 16px', color: '#aaa', fontSize: 12, borderBottom: '1px solid #2a2f3e', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontFamily: 'monospace' }}>
        <span style={{ color: '#5b90d8', fontWeight: 600 }}>ChartTest</span>
        <span>{INSTRUMENT}</span>
        <span style={{ color: wsStatus.startsWith('subscribed') ? '#22c55e' : '#f59e0b' }}>WS: {wsStatus}</span>
        <span>Ticks: {tickCount}</span>
        {snapError && <span style={{ color: '#ef4444' }}>Snap: {snapError}</span>}
        {ready && <span style={{ color: '#22c55e' }}>READY</span>}
        <span style={{ color: '#555' }}>msgs: [{lastMsgTypes.join(', ')}]</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', cursor: 'default', display: 'block' }}
      />
    </div>
  );
}
