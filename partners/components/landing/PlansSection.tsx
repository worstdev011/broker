'use client';

import { useLandingAuth } from './LandingAuthContext';

const PLANS = [
  {
    name: 'REVENUE SHARE',
    tagline: 'До 80% от прибыли',
    bullets: [
      'Зависит от активности трейдеров',
      'Лучше для долгой монетизации',
      'Оптимально при стабильном трафике',
    ],
    cta: 'ПОДКЛЮЧИТЬ ТАРИФ',
    href: '/register',
  },
  {
    name: 'CPA',
    tagline: 'Кастомные ставки по гео',
    bullets: [
      'Оплата за активного клиента (FTD)',
      'Требования к качеству источников',
      'Согласование с менеджером',
    ],
    cta: 'ЗАПРОСИТЬ УСЛОВИЯ',
    href: '/register',
  },
  {
    name: 'HYBRID',
    tagline: 'RevShare + CPA',
    bullets: [
      'Баланс кешфлоу и LTV',
      'Гибкие пропорции',
      'Индивидуальный расчёт',
    ],
    cta: 'УЗНАТЬ ПОДРОБНЕЕ',
    href: '/register',
  },
];

const TICKER_ITEMS = Array.from({ length: 12 }, () => 'PARTNERS\u00A0\u00A0CT').join('\u00A0\u00A0');

export function PlansSection() {
  const { open } = useLandingAuth();
  return (
    <section className="relative bg-[#080C0A] pt-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        {/* Title */}
        <h2
          className="font-display font-black italic text-white mb-16 tracking-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          ПЛАНЫ И СТАВКИ
        </h2>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0D120B] p-7"
            >
              <p className="font-display font-bold text-white text-base mb-1 tracking-wide">
                {plan.name}
              </p>
              <p className="text-lime text-sm font-semibold mb-6">{plan.tagline}</p>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-white/55 text-sm leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-lime/70 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => open('register')}
                className="block w-full text-center py-3 rounded-xl bg-lime hover:bg-lime-hover text-[#080C0A] font-bold text-xs tracking-widest transition-all shadow-[0_0_20px_rgba(197,255,71,0.15)] hover:shadow-[0_0_35px_rgba(197,255,71,0.3)]"
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="relative mt-16 overflow-hidden" style={{ transform: 'skewY(-1.5deg)' }}>
        <div className="bg-lime py-3 flex">
          <div
            className="flex whitespace-nowrap text-[#080C0A] font-display font-black text-sm tracking-[0.25em] animate-[ticker_18s_linear_infinite]"
            style={{ willChange: 'transform' }}
          >
            {TICKER_ITEMS}&nbsp;&nbsp;&nbsp;&nbsp;{TICKER_ITEMS}
          </div>
        </div>
        <style>{`
          @keyframes ticker {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </section>
  );
}
