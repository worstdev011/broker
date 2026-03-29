const STEPS = [
  {
    n: 1,
    title: 'РЕГИСТРАЦИЯ',
    desc: 'Пройдите быструю верификацию для доступа к ставкам и материалам.',
  },
  {
    n: 2,
    title: 'ПОЛУЧИТЕ\nРЕФССЫЛКИ',
    desc: 'Настройте постбэки, саб-ID и атрибуцию для точной аналитики.',
  },
  {
    n: 3,
    title: 'ЗАПУСТИТЕ\nТРАФИК',
    desc: 'Используйте наши промо-материалы и гайды по комплаенсу.',
  },
  {
    n: 4,
    title: 'ПОЛУЧАЙТЕ\nВЫПЛАТЫ',
    desc: 'Гибкий график, быстрый саппорт, рост уровня и ставок по объёму.',
  },
];

function ArrowRight() {
  return (
    <div className="hidden lg:flex items-center justify-center shrink-0 w-10">
      <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
        <path
          d="M0 8h28M22 2l8 6-8 6"
          stroke="rgba(197,255,71,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="relative bg-[#080C0A] py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">

        <h2
          className="font-display font-black italic text-white text-center mb-16 tracking-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          КАК ЭТО РАБОТАЕТ
        </h2>

        <div className="flex flex-col lg:flex-row items-stretch gap-0">
          {STEPS.map((step, i) => (
            <div key={step.n} className="flex lg:flex-row items-center flex-1 min-w-0">
              {/* Card */}
              <div className="relative flex-1 bg-lime rounded-2xl p-6 min-h-[160px] flex flex-col justify-between">
                {/* Step number — top right */}
                <span className="absolute top-4 right-4 font-display font-black text-[#080C0A]/30 text-4xl leading-none select-none">
                  {step.n}
                </span>

                <div>
                  <p className="font-display font-bold text-[#080C0A] text-sm tracking-wide whitespace-pre-line leading-tight mb-3">
                    {step.title}
                  </p>
                  <p className="text-[#1a2a10]/80 text-xs leading-relaxed max-w-[180px]">
                    {step.desc}
                  </p>
                </div>
              </div>

              {/* Arrow between cards */}
              {i < STEPS.length - 1 && <ArrowRight />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
