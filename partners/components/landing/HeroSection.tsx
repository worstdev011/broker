'use client';

import { useLandingAuth } from './LandingAuthContext';

const STATS = [
  {
    label: (
      <>
        <span className="text-lime font-semibold not-italic">RevShare</span>
        {' до 80%'}
      </>
    ),
  },
  {
    label: (
      <>
        {'Кастомный '}
        <span className="text-lime font-semibold not-italic italic">CPA по гео</span>
      </>
    ),
  },
  {
    label: (
      <>
        <span className="text-lime font-semibold not-italic">Гибридные</span>
        {' модели'}
      </>
    ),
  },
  {
    label: (
      <>
        {'Выплаты '}
        <span className="text-lime font-semibold not-italic">по графику</span>
      </>
    ),
  },
];

export function HeroSection() {
  const { open } = useLandingAuth();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#080C0A] pt-16">

      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(30, 70, 20, 0.55) 0%, rgba(10, 30, 10, 0.25) 45%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">

        <h1
          className="font-display font-black italic text-white leading-[0.92] tracking-tight mb-7"
          style={{ fontSize: 'clamp(2.4rem, 6.5vw, 5rem)' }}
        >
          ЗАРАБАТЫВАЙТЕ С<br />
          ПРЕМИАЛЬНОЙ<br />
          ПАРТНЁРСКОЙ ПРОГРАММОЙ
        </h1>

        <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-[560px] mb-10">
          RevShare до 80%, гибкой CPA и Hybrid, прозрачная аналитика и мощные
          промо-инструменты для масштабирования трафика
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <button
            onClick={() => open('register')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-lime hover:bg-lime-hover text-[#080C0A] font-bold text-sm tracking-wide transition-all shadow-[0_0_40px_rgba(197,255,71,0.25)] hover:shadow-[0_0_60px_rgba(197,255,71,0.35)]"
          >
            СТАТЬ ПАРТНЕРОМ
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <a
            href="#about"
            className="inline-flex items-center px-8 py-3.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold text-sm tracking-wide transition-all"
          >
            УЗНАТЬ ПОДРОБНЕЕ
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {STATS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-white/50 text-sm">
              {i > 0 && <span className="hidden sm:block w-1 h-1 rounded-full bg-white/20" />}
              <span className="italic">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/25 animate-bounce">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

    </section>
  );
}
