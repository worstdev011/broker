'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export const ONBOARDING_STORAGE_KEY = 'onboarding_completed';

const TOUR_STEPS = [
  {
    id: 'instrument',
    selector: '[data-tour="instrument"]',
    placement: 'bottom' as const,
    title: 'Выбор актива',
    text: 'Более 100 валютных пар, крипто и OTC активов. OTC - круглосуточно.',
  },
  {
    id: 'timeframe',
    selector: '[data-tour="timeframe"]',
    placement: 'bottom' as const,
    title: 'Таймфрейм',
    text: 'Выбери временной интервал свечи - от 5 секунд до 1 дня.',
  },
  {
    id: 'time-field',
    selector: '[data-tour="time-field"]',
    placement: 'left' as const,
    title: 'Время экспирации',
    text: 'Укажи через сколько закроется сделка. Чем точнее прогноз - тем выше прибыль.',
  },
  {
    id: 'amount-field',
    selector: '[data-tour="amount-field"]',
    placement: 'left' as const,
    title: 'Сумма сделки',
    text: 'Введи сумму которую хочешь поставить. Начни с минимальной чтобы освоиться.',
  },
  {
    id: 'trade-buttons',
    selector: '[data-tour="trade-buttons"]',
    placement: 'left' as const,
    title: 'Открыть сделку',
    text: 'КУПИТЬ - если считаешь что цена вырастет. ПРОДАТЬ - если упадёт. Результат через время экспирации.',
  },
  {
    id: 'balance',
    selector: '[data-tour="balance"]',
    placement: 'bottom' as const,
    title: 'Твой счёт',
    text: 'Здесь отображается баланс. Переключайся между демо и реальным счётом.',
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
  const [stepIdx, setStepIdx] = useState(0);
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null);
  const [visible, setVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const step = TOUR_STEPS[stepIdx];
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  const finish = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setVisible(false);
    setTimeout(onComplete, 200);
  }, [onComplete]);

  // Find target element and compute positions
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

  // Re-position on step change
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
        // After setting target, wait for popup to render then position it
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

  // Re-compute on resize
  useEffect(() => {
    const onResize = () => updatePosition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [updatePosition]);

  // ESC to skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  // Cleanup raf on unmount
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_STORAGE_KEY)) return null;
  if (!step) return null;

  const hasTarget = target !== null && popupPos !== null;
  const r = target?.rect;

  // Cutout padding
  const PAD = 6;
  const rx = 8;

  return (
    <>
      {/* ── Overlay with cutout ── */}
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

      {/* ── Target highlight border ── */}
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

      {/* ── Popup ── */}
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
        {/* Header */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
            {step.title}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 16px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.58)', lineHeight: 1.6 }}>
          {step.text}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 14px 13px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Skip */}
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
            Пропустить
          </button>

          {/* Progress dots */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            {TOUR_STEPS.map((_, i) => (
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

          {/* Next / Finish */}
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
            {isLast ? 'Начать' : 'Далее →'}
          </button>
        </div>
      </div>
    </>
  );
}
