'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';

export const ONBOARDING_STORAGE_KEY = 'onboarding_completed';

const TOUR_STEP_DEFS = [
  {
    id: 'instrument',
    selector: '[data-tour="instrument"]',
    placement: 'bottom' as const,
    titleKey: 'tour_instrument_title' as const,
    bodyKey: 'tour_instrument_body' as const,
  },
  {
    id: 'timeframe',
    selector: '[data-tour="timeframe"]',
    placement: 'bottom' as const,
    titleKey: 'tour_timeframe_title' as const,
    bodyKey: 'tour_timeframe_body' as const,
  },
  {
    id: 'time-field',
    selector: '[data-tour="time-field"]',
    placement: 'left' as const,
    titleKey: 'tour_expiry_title' as const,
    bodyKey: 'tour_expiry_body' as const,
  },
  {
    id: 'amount-field',
    selector: '[data-tour="amount-field"]',
    placement: 'left' as const,
    titleKey: 'tour_amount_title' as const,
    bodyKey: 'tour_amount_body' as const,
  },
  {
    id: 'trade-buttons',
    selector: '[data-tour="trade-buttons"]',
    placement: 'left' as const,
    titleKey: 'tour_trade_title' as const,
    bodyKey: 'tour_trade_body' as const,
  },
  {
    id: 'balance',
    selector: '[data-tour="balance"]',
    placement: 'bottom' as const,
    titleKey: 'tour_balance_title' as const,
    bodyKey: 'tour_balance_body' as const,
  },
] as const;

type Placement = 'bottom' | 'top' | 'left' | 'right';

interface PopupPos {
  top: number;
  left: number;
}

interface TargetInfo {
  rect: DOMRect;
  el: Element;
}

function calcPopupPos(rect: DOMRect, placement: Placement, popupW: number, popupH: number): PopupPos {
  const GAP = 12;
  let top = 0;
  let left = 0;

  if (placement === 'bottom') {
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2 - popupW / 2;
  } else if (placement === 'top') {
    top = rect.top - GAP - popupH;
    left = rect.left + rect.width / 2 - popupW / 2;
  } else if (placement === 'left') {
    top = rect.top + rect.height / 2 - popupH / 2;
    left = rect.left - popupW - GAP;
  } else {
    top = rect.top + rect.height / 2 - popupH / 2;
    left = rect.right + GAP;
  }

  left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
  top  = Math.max(8, Math.min(top,  window.innerHeight - popupH - 8));

  return { top, left };
}

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const t = useTranslations('terminal');
  const [stepIdx, setStepIdx] = useState(0);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
  const [visible, setVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const step = TOUR_STEP_DEFS[stepIdx];
  const isLast = stepIdx === TOUR_STEP_DEFS.length - 1;

  const finish = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setVisible(false);
    setTimeout(onComplete, 200);
  }, [onComplete]);

  const updatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTarget({ rect, el });

    const popupW = 300;
    const popupH = popupRef.current?.offsetHeight || 150;
    setPopupPos(calcPopupPos(rect, step.placement, popupW, popupH));
  }, [step]);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;
    setVisible(false);
    setTarget(null);
    setPopupPos(null);

    const tryFind = (attempts = 0) => {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTarget({ rect, el });
        requestAnimationFrame(() => {
          const popupW = 300;
          const popupH = popupRef.current?.offsetHeight || 150;
          setPopupPos(calcPopupPos(rect, step.placement, popupW, popupH));
          requestAnimationFrame(() => setVisible(true));
        });
      } else if (attempts < 20) {
        setTimeout(() => tryFind(attempts + 1), 150);
      }
    };

    const delay = setTimeout(() => tryFind(), stepIdx === 0 ? 800 : 0);
    return () => clearTimeout(delay);
  }, [stepIdx, step]);

  useEffect(() => {
    const ev = () => updatePosition();
    window.addEventListener('resize', ev);
    return () => window.removeEventListener('resize', ev);
  }, [updatePosition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_STORAGE_KEY)) return null;
  if (!step) return null;

  const hasTarget = target !== null && popupPos !== null;
  const r = target?.rect;

  const PAD = 6;
  const rx = 8;

  return (
    <>
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 9997,
          pointerEvents: 'all',
          transition: 'opacity 0.2s ease',
          opacity: visible ? 1 : 0,
        }}
        onClick={finish}
      >
        <defs>
          <mask id="ct-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {r && (
              <rect
                x={r.left - PAD}
                y={r.top - PAD}
                width={r.width + PAD * 2}
                height={r.height + PAD * 2}
                rx={rx}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(6,18,48,0.72)"
          mask="url(#ct-mask)"
        />
      </svg>

      {r && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 9998,
            pointerEvents: 'none',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <rect
            x={r.left - PAD}
            y={r.top - PAD}
            width={r.width + PAD * 2}
            height={r.height + PAD * 2}
            rx={rx}
            fill="none"
            stroke="rgba(36,120,255,0.85)"
            strokeWidth="1.5"
          />
        </svg>
      )}

      <div
        ref={popupRef}
        style={{
          position: 'fixed',
          top: popupPos?.top ?? -9999,
          left: popupPos?.left ?? -9999,
          width: '300px',
          zIndex: 9999,
          background: 'rgba(8,15,28,0.97)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(36,120,255,0.1)',
          opacity: visible && popupPos ? 1 : 0,
          transform: visible && popupPos ? 'none' : 'translateY(6px) scale(0.97)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
          pointerEvents: 'all',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
            {t(step.titleKey)}
          </div>
        </div>

        <div style={{ padding: '8px 16px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>
          {t(step.bodyKey)}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 14px 13px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button
            type="button"
            onClick={finish}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.32)',
              padding: '6px 8px',
              borderRadius: '6px',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.32)'; }}
          >
            {t('tour_skip')}
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {TOUR_STEP_DEFS.map((_, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: i === stepIdx ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  background: i === stepIdx ? '#2478ff' : 'rgba(255,255,255,0.18)',
                  transition: 'width 0.2s ease, background 0.2s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isLast) { finish(); return; }
              setVisible(false);
              setTimeout(() => setStepIdx((v) => v + 1), 150);
            }}
            style={{
              background: '#2478ff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 18px',
              boxShadow: '0 2px 12px rgba(36,120,255,0.3)',
              transition: 'background 0.15s',
              flexShrink: 0,
              marginLeft: 'auto',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#3d8aff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2478ff'; }}
          >
            {isLast ? t('tour_start') : t('tour_next')}
          </button>
        </div>
      </div>
    </>
  );
}
