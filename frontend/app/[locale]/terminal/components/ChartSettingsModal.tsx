'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalA11y } from '@/lib/hooks/useModalA11y';
import { loadChartSettings, saveChartSettings, type ChartSettings } from '@/lib/chartSettings';
import { toast as showToast } from '@/stores/toast.store';

// ── helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.8px]"
       style={{ color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '14px 0' }} />;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: checked ? '#2478ff' : 'rgba(255,255,255,0.12)',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 200ms',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 17 : 3,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 200ms',
          display: 'block',
        }}
      />
    </button>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function ChartSettingsModal({ onClose }: { onClose: () => void }) {
  const modalRef = useModalA11y(true, onClose, { focusFirstSelector: '[data-chart-settings-first]' });
  const [settings, setSettings] = useState<ChartSettings>(() => loadChartSettings());
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(settings.backgroundImage);
  const [isDragOver, setIsDragOver] = useState(false);

  const bullishInputRef = useRef<HTMLInputElement>(null);
  const bearishInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── image handling ──
  const applyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Пожалуйста, выберите файл изображения', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setBackgroundImagePreview(dataUrl);
      setSettings((prev) => ({ ...prev, backgroundImage: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyImageFile(file);
  };

  const handleRemoveImage = () => {
    setBackgroundImagePreview(null);
    setSettings((prev) => ({ ...prev, backgroundImage: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── save / reset ──
  const handleSave = () => {
    saveChartSettings(settings);
    window.location.reload();
  };

  const handleReset = () => {
    const def: ChartSettings = {
      bullishColor: '#45b833',
      bearishColor: '#ff3d1f',
      backgroundImage: null,
      backgroundOpacity: 0.3,
      showCountdown: true,
      showGrid: true,
      showWatermark: true,
      timezoneOffset: 2,
    };
    setSettings(def);
    setBackgroundImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    saveChartSettings(def);
    window.location.reload();
  };

  // ── timezone dropdown ──
  const [tzOpen, setTzOpen] = useState(false);
  const [tzRect, setTzRect] = useState<DOMRect | null>(null);
  const tzBtnRef = useRef<HTMLButtonElement>(null);

  const openTz = () => {
    if (tzBtnRef.current) setTzRect(tzBtnRef.current.getBoundingClientRect());
    setTzOpen(true);
  };

  useEffect(() => {
    if (!tzOpen) return;
    const close = () => setTzOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [tzOpen]);

  const TZ_OPTIONS: { offset: number; label: string }[] = [
    { offset: -12,  label: 'UTC-12' },
    { offset: -11,  label: 'UTC-11' },
    { offset: -10,  label: 'UTC-10' },
    { offset: -9,   label: 'UTC-9' },
    { offset: -8,   label: 'UTC-8 - Лос-Анджелес' },
    { offset: -5,   label: 'UTC-5 - Нью-Йорк' },
    { offset: 0,    label: 'UTC+0 - Лондон' },
    { offset: 1,    label: 'UTC+1 - Париж' },
    { offset: 2,    label: 'UTC+2 - Киев' },
    { offset: 3,    label: 'UTC+3 - Москва' },
    { offset: 4,    label: 'UTC+4 - Дубай' },
    { offset: 5.5,  label: 'UTC+5:30 - Мумбаи' },
    { offset: 7,    label: 'UTC+7 - Бангкок' },
    { offset: 8,    label: 'UTC+8 - Пекин' },
    { offset: 9,    label: 'UTC+9 - Токио' },
    { offset: 10,   label: 'UTC+10 - Сидней' },
    { offset: 12,   label: 'UTC+12 - Окленд' },
  ];
  const activeTz = TZ_OPTIONS.find((o) => o.offset === settings.timezoneOffset) ?? TZ_OPTIONS[8]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cset-title"
        aria-describedby="cset-desc"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#0d1e3a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="cset-title" style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>
            Настройки графика
          </h2>
          <p id="cset-desc" className="sr-only">Настройте цвета свечей и параметры отображения</p>
          <button
            type="button"
            data-chart-settings-first
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ padding: '0 16px', maxHeight: 'calc(100vh - 160px)', overflowY: 'auto' }}>

          {/* ── Цвета свечей ── */}
          <SectionLabel>Цвета свечей</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Bullish */}
            <ColorTile
              label="Бычья"
              color={settings.bullishColor}
              accentColor="#45b833"
              bullish={true}
              inputRef={bullishInputRef}
              onChange={(c) => setSettings((p) => ({ ...p, bullishColor: c }))}
            />
            <ColorTile
              label="Медвежья"
              color={settings.bearishColor}
              accentColor="#ff3d1f"
              bullish={false}
              inputRef={bearishInputRef}
              onChange={(c) => setSettings((p) => ({ ...p, bearishColor: c }))}
            />
          </div>

          <Divider />

          {/* ── Часовой пояс ── */}
          <SectionLabel>Часовой пояс</SectionLabel>
          <div style={{ position: 'relative' }}>
            <button
              ref={tzBtnRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); tzOpen ? setTzOpen(false) : openTz(); }}
              style={{
                width: '100%',
                height: 38,
                padding: '0 12px',
                background: tzOpen ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${tzOpen ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background 150ms, border-color 150ms',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: 13 }}>{activeTz.label}</span>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, transform: tzOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {tzOpen && tzRect && typeof document !== 'undefined' && createPortal(
            <div
              className="tz-dropdown"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: tzRect.bottom + 4,
                left: tzRect.left,
                width: tzRect.width,
                background: '#0a1a30',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                maxHeight: 220,
                overflowY: 'auto',
                zIndex: 9999,
              }}
            >
              {TZ_OPTIONS.map((opt) => {
                const active = opt.offset === settings.timezoneOffset;
                return (
                  <button
                    key={opt.offset}
                    type="button"
                    onClick={() => { setSettings((p) => ({ ...p, timezoneOffset: opt.offset })); setTzOpen(false); }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: active ? 'rgba(51,71,255,0.15)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: active ? 500 : 400,
                      color: active ? '#6b85ff' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    {active
                      ? <svg width="8" height="8" viewBox="0 0 8 8" fill="#6b85ff"><circle cx="4" cy="4" r="3" /></svg>
                      : <span style={{ width: 8, flexShrink: 0 }} />
                    }
                    {opt.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )}

          <Divider />

          {/* ── Фоновое изображение ── */}
          <SectionLabel>Фоновое изображение</SectionLabel>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

          {backgroundImagePreview ? (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
              <img
                src={backgroundImagePreview}
                alt="background preview"
                style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="Удалить фон"
                style={{
                  position: 'absolute', top: 6, right: 6, width: 22, height: 22,
                  borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none',
                  cursor: 'pointer', color: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                  Прозрачность {Math.round(settings.backgroundOpacity * 100)}%
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={settings.backgroundOpacity}
                  onChange={(e) => setSettings((p) => ({ ...p, backgroundOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-[#2478ff]"
                  style={{ height: 3, cursor: 'pointer' }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: 10,
                border: `1.5px dashed ${isDragOver ? 'rgba(36,120,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
                background: isDragOver ? 'rgba(36,120,255,0.04)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(36,120,255,0.4)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(36,120,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isDragOver) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.02)';
                }
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ margin: '0 auto 5px', color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                Перетащи или нажми для выбора
              </span>
            </button>
          )}

          <Divider />

          {/* ── Отображение ── */}
          <SectionLabel>Отображение</SectionLabel>
          <div>
            {[
              { key: 'showCountdown' as const, label: 'Таймер отсчёта до закрытия свечи' },
              { key: 'showGrid' as const,      label: 'Сетка на графике' },
              { key: 'showWatermark' as const, label: 'Название пары на фоне' },
            ].map(({ key, label }, i, arr) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
                <Toggle
                  checked={settings[key]}
                  onChange={() => setSettings((p) => ({ ...p, [key]: !p[key] }))}
                />
              </div>
            ))}
          </div>

          <div style={{ height: 12 }} />
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}>
          <ResetButton onClick={handleReset}>Сбросить</ResetButton>
          <div style={{ display: 'flex', gap: 8 }}>
            <CancelButton onClick={onClose}>Отмена</CancelButton>
            <SaveButton onClick={handleSave}>Сохранить</SaveButton>
          </div>
        </div>
      </div>

      <style>{`
        .tz-dropdown::-webkit-scrollbar { width: 4px; }
        .tz-dropdown::-webkit-scrollbar-track { background: transparent; }
        .tz-dropdown::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }
        .tz-dropdown { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
      `}</style>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function CandleIcon({ color, bullish }: { color: string; bullish: boolean }) {
  const W = 36;
  const H = 44;
  const cx = W / 2;
  const bodyTop    = bullish ? 12 : 6;
  const bodyBottom = bullish ? H - 6 : H - 12;
  const bodyW = 14;
  const bodyX = cx - bodyW / 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <line x1={cx} y1={3} x2={cx} y2={H - 3} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <rect
        x={bodyX} y={bodyTop}
        width={bodyW} height={bodyBottom - bodyTop}
        rx={2} fill={color}
        style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
      />
    </svg>
  );
}

function ColorTile({
  label,
  color,
  accentColor,
  bullish,
  inputRef,
  onChange,
}: {
  label: string;
  color: string;
  accentColor: string;
  bullish: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (color: string) => void;
}) {
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: `2px solid ${accentColor}`,
        borderRadius: 10,
        padding: '10px 10px 8px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        userSelect: 'none',
        minHeight: 80,
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', alignSelf: 'flex-start' }}>{label}</span>
      <CandleIcon color={color} bullish={bullish} />
      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px' }}>
        {color.toUpperCase()}
      </span>
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="sr-only"
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
    </div>
  );
}

function ResetButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13,
        color: hovered ? '#ff4655' : 'rgba(255,255,255,0.35)',
        padding: '0 4px',
        height: 34,
        transition: 'color 150ms',
      }}
    >
      {children}
    </button>
  );
}

function CancelButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 8,
        padding: '0 20px',
        height: 34,
        fontSize: 13,
        color: hovered ? '#fff' : 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        transition: 'color 150ms, border-color 150ms',
      }}
    >
      {children}
    </button>
  );
}

function SaveButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#3347ff',
        border: 'none',
        borderRadius: 8,
        padding: '0 24px',
        height: 34,
        fontSize: 13,
        fontWeight: 600,
        color: '#fff',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        filter: hovered ? 'brightness(1.12)' : 'brightness(1)',
        transition: 'transform 150ms, filter 150ms',
        boxShadow: '0 4px 16px rgba(51,71,255,0.35)',
      }}
    >
      {children}
    </button>
  );
}
