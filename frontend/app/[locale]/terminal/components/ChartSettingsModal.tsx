'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import { loadChartSettings, saveChartSettings, type ChartSettings } from '@/lib/chartSettings';
import { toast as showToast } from '@/stores/toast.store';

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full shrink-0 transition-colors duration-200 ${checked ? 'bg-[#3347ff]' : 'bg-white/10'}`}
    >
      <span
        className="absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white transition-all duration-200"
        style={{ left: checked ? 19 : 3 }}
      />
    </button>
  );
}

// ── Row with toggle ────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  last = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2.5 ${!last ? 'border-b border-white/[0.05]' : ''}`}>
      <div className="min-w-0">
        <p className="text-[13px] text-white/75 leading-tight">{label}</p>
        {description && <p className="text-[11px] text-white/35 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Candle icon ────────────────────────────────────────────────────────────────

function CandleIcon({ color, bullish }: { color: string; bullish: boolean }) {
  const cx = 18;
  const bodyTop    = bullish ? 12 : 6;
  const bodyBottom = bullish ? 38 : 34;
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
      <line x1={cx} y1="3" x2={cx} y2="41" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <rect
        x={cx - 7} y={bodyTop}
        width="14" height={bodyBottom - bodyTop}
        rx="2" fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color}70)` }}
      />
    </svg>
  );
}

// ── Color tile ────────────────────────────────────────────────────────────────

function ColorTile({
  label,
  color,
  bullish,
  inputRef,
  onChange,
}: {
  label: string;
  color: string;
  bullish: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (color: string) => void;
}) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center gap-2 px-3 pt-3 pb-2.5 rounded-xl bg-white/[0.05] border border-white/[0.07] cursor-pointer hover:bg-white/[0.08] hover:border-white/[0.12] transition-all group"
      style={{ borderBottom: `2px solid ${color}` }}
    >
      <span className="text-[11px] text-white/40 self-start">{label}</span>
      <CandleIcon color={color} bullish={bullish} />
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
        <span className="text-[10px] font-mono text-white/45 tracking-wide">{color.toUpperCase()}</span>
      </div>
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
      />
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.8px] text-white/30 mb-2">{children}</p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ChartSettingsModal({
  onClose,
  showTraderTip,
  onToggleTraderTip,
}: {
  onClose: () => void;
  showTraderTip?: boolean;
  onToggleTraderTip?: () => void;
}) {
  const modalRef = useModalA11y(true, onClose, { focusFirstSelector: '[data-cset-close]' });
  const [settings, setSettings] = useState<ChartSettings>(() => loadChartSettings());
  const [bgPreview, setBgPreview] = useState<string | null>(settings.backgroundImage);
  const [isDragOver, setIsDragOver] = useState(false);

  const bullishRef = useRef<HTMLInputElement>(null);
  const bearishRef = useRef<HTMLInputElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const applyFile = (file: File) => {
    if (!file.type.startsWith('image/')) { showToast('Пожалуйста, выберите файл изображения', 'warning'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setBgPreview(url);
      setSettings((p) => ({ ...p, backgroundImage: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => { saveChartSettings(settings); window.location.reload(); };
  const handleReset = () => {
    const def: ChartSettings = {
      bullishColor: '#45b833', bearishColor: '#ff3d1f',
      backgroundImage: null, backgroundOpacity: 0.3,
      showCountdown: true, showGrid: true, showWatermark: true, timezoneOffset: 2,
    };
    setSettings(def);
    setBgPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    saveChartSettings(def);
    window.location.reload();
  };

  // timezone dropdown
  const [tzOpen, setTzOpen] = useState(false);
  const [tzRect, setTzRect] = useState<DOMRect | null>(null);
  const tzBtnRef = useRef<HTMLButtonElement>(null);
  const openTz = () => { if (tzBtnRef.current) setTzRect(tzBtnRef.current.getBoundingClientRect()); setTzOpen(true); };
  useEffect(() => {
    if (!tzOpen) return;
    const close = () => setTzOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [tzOpen]);

  const TZ_OPTIONS: { offset: number; label: string }[] = [
    { offset: -12, label: 'UTC-12' },
    { offset: -11, label: 'UTC-11' },
    { offset: -10, label: 'UTC-10' },
    { offset: -9,  label: 'UTC-9' },
    { offset: -8,  label: 'UTC-8 — Лос-Анджелес' },
    { offset: -5,  label: 'UTC-5 — Нью-Йорк' },
    { offset: 0,   label: 'UTC+0 — Лондон' },
    { offset: 1,   label: 'UTC+1 — Париж' },
    { offset: 2,   label: 'UTC+2 — Киев' },
    { offset: 3,   label: 'UTC+3 — Москва' },
    { offset: 4,   label: 'UTC+4 — Дубай' },
    { offset: 5.5, label: 'UTC+5:30 — Мумбаи' },
    { offset: 7,   label: 'UTC+7 — Бангкок' },
    { offset: 8,   label: 'UTC+8 — Пекин' },
    { offset: 9,   label: 'UTC+9 — Токио' },
    { offset: 10,  label: 'UTC+10 — Сидней' },
    { offset: 12,  label: 'UTC+12 — Окленд' },
  ];
  const activeTz = TZ_OPTIONS.find((o) => o.offset === settings.timezoneOffset) ?? TZ_OPTIONS[8]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cset-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] bg-[#0b1a30] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h2 id="cset-title" className="text-[15px] font-semibold text-white">Настройки графика</h2>
          <button
            type="button"
            data-cset-close
            onClick={onClose}
            aria-label="Закрыть"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/35 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[calc(100vh-160px)] overflow-y-auto">

          {/* Цвета свечей */}
          <div>
            <SectionLabel>Цвета свечей</SectionLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <ColorTile
                label="Бычья" color={settings.bullishColor} bullish={true} inputRef={bullishRef}
                onChange={(c) => setSettings((p) => ({ ...p, bullishColor: c }))}
              />
              <ColorTile
                label="Медвежья" color={settings.bearishColor} bullish={false} inputRef={bearishRef}
                onChange={(c) => setSettings((p) => ({ ...p, bearishColor: c }))}
              />
            </div>
          </div>

          {/* Часовой пояс */}
          <div>
            <SectionLabel>Часовой пояс</SectionLabel>
            <div className="relative">
              <button
                ref={tzBtnRef}
                type="button"
                onClick={(e) => { e.stopPropagation(); tzOpen ? setTzOpen(false) : openTz(); }}
                className={`w-full h-9 px-3 flex items-center justify-between rounded-lg border text-[13px] text-white transition-colors ${tzOpen ? 'bg-white/[0.09] border-white/[0.18]' : 'bg-white/[0.05] border-white/[0.08] hover:bg-white/[0.08]'}`}
              >
                <span>{activeTz.label}</span>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  className="text-white/35 shrink-0 transition-transform duration-150"
                  style={{ transform: tzOpen ? 'rotate(180deg)' : 'none' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {tzOpen && tzRect && typeof document !== 'undefined' && createPortal(
            <div
              onMouseDown={(e) => e.stopPropagation()}
              className="tz-dropdown fixed bg-[#0a1a30] border border-white/[0.1] rounded-xl shadow-2xl overflow-y-auto"
              style={{ top: tzRect.bottom + 4, left: tzRect.left, width: tzRect.width, maxHeight: 220, zIndex: 9999 }}
            >
              {TZ_OPTIONS.map((opt) => {
                const active = opt.offset === settings.timezoneOffset;
                return (
                  <button
                    key={opt.offset}
                    type="button"
                    onClick={() => { setSettings((p) => ({ ...p, timezoneOffset: opt.offset })); setTzOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 border-b border-white/[0.04] last:border-0 transition-colors
                      ${active ? 'bg-[#3347ff]/15 text-[#6b85ff] font-medium' : 'text-white/65 hover:bg-white/[0.05]'}`}
                  >
                    {active
                      ? <span className="w-1.5 h-1.5 rounded-full bg-[#6b85ff] shrink-0" />
                      : <span className="w-1.5 shrink-0" />
                    }
                    {opt.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}

          {/* Фоновое изображение */}
          <div>
            <SectionLabel>Фоновое изображение</SectionLabel>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); }} />
            {bgPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={bgPreview} alt="" className="w-full h-20 object-cover block" />
                <button
                  type="button"
                  onClick={() => { setBgPreview(null); setSettings((p) => ({ ...p, backgroundImage: null })); if (fileRef.current) fileRef.current.value = ''; }}
                  aria-label="Удалить фон"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg width="9" height="9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-white/35">Прозрачность</span>
                    <span className="text-[11px] text-white/50 tabular-nums">{Math.round(settings.backgroundOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={settings.backgroundOpacity}
                    onChange={(e) => setSettings((p) => ({ ...p, backgroundOpacity: parseFloat(e.target.value) }))}
                    className="w-full h-1 accent-[#3347ff] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) applyFile(f); }}
                className={`w-full py-4 rounded-xl border border-dashed transition-colors text-center ${isDragOver ? 'border-[#3347ff]/50 bg-[#3347ff]/05' : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]'}`}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="mx-auto mb-1.5 text-white/25">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-[12px] text-white/30">Перетащите или нажмите для выбора</span>
              </button>
            )}
          </div>

          {/* Отображение */}
          <div>
            <SectionLabel>Отображение</SectionLabel>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 divide-y divide-white/[0.05]">
              <ToggleRow
                label="Таймер до закрытия свечи"
                checked={settings.showCountdown}
                onChange={() => setSettings((p) => ({ ...p, showCountdown: !p.showCountdown }))}
              />
              <ToggleRow
                label="Сетка на графике"
                checked={settings.showGrid}
                onChange={() => setSettings((p) => ({ ...p, showGrid: !p.showGrid }))}
              />
              <ToggleRow
                label="Название пары на фоне"
                checked={settings.showWatermark}
                onChange={() => setSettings((p) => ({ ...p, showWatermark: !p.showWatermark }))}
              />
              {onToggleTraderTip !== undefined && (
                <ToggleRow
                  label="Совет от Trady AI"
                  checked={showTraderTip ?? false}
                  onChange={onToggleTraderTip}
                  last
                />
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={handleReset}
            className="text-[13px] text-white/30 hover:text-[#ff4655] transition-colors px-1 h-9"
          >
            Сбросить
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-5 rounded-lg border border-white/[0.1] text-[13px] text-white/55 hover:text-white hover:border-white/[0.2] transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-5 rounded-lg bg-[#3347ff] hover:bg-[#2a3de0] text-[13px] font-semibold text-white transition-colors shadow-lg shadow-[#3347ff]/25"
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tz-dropdown::-webkit-scrollbar { width: 4px; }
        .tz-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        .tz-dropdown { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
      `}</style>
    </div>
  );
}
