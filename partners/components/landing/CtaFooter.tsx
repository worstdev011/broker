'use client';

import Link from 'next/link';
import { useLandingAuth } from './LandingAuthContext';

function LogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="28" height="28" rx="6" fill="#C5FF47" fillOpacity="0.12" />
      <path
        d="M16.5 4L9 15.5H14L11.5 24L20 12.5H15L16.5 4Z"
        fill="#C5FF47"
        stroke="#C5FF47"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CtaFooter() {
  const { open } = useLandingAuth();
  return (
    <>
      {/* CTA Section */}
      <section className="relative bg-[#080C0A] py-28 overflow-hidden">
        {/* Centre glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 70%, rgba(25,65,15,0.6) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2
            className="font-display font-black italic text-white tracking-tight mb-5"
            style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)' }}
          >
            ГОТОВЫ УВЕЛИЧИТЬ ДОХОД?
          </h2>

          <p className="text-white/50 text-sm sm:text-base mb-10 flex items-center justify-center gap-2">
            Присоединяйтесь к партнёрке и получите доступ к планам, промо и аналитике.
            <span className="text-lime">✓</span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => open('register')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-lime hover:bg-lime-hover text-[#080C0A] font-bold text-sm tracking-wide transition-all shadow-[0_0_40px_rgba(197,255,71,0.2)] hover:shadow-[0_0_60px_rgba(197,255,71,0.35)]"
            >
              ЗАРЕГИСТРИРОВАТЬСЯ
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button
              onClick={() => open('login')}
              className="inline-flex items-center px-8 py-3.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-semibold text-sm tracking-wide transition-all"
            >
              ВОЙТИ
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080C0A] border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 select-none">
            <LogoIcon />
            <span className="font-display font-bold text-sm tracking-[0.2em] uppercase text-white/70">
              Partners
            </span>
          </Link>

          <p className="text-white/25 text-xs">© 2025 CT Partners</p>
        </div>
      </footer>
    </>
  );
}
