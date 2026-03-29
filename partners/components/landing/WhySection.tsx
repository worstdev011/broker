const FEATURES = [
  {
    title: (
      <>
        ГИБКИЕ МОДЕЛИ{' '}
        <span className="text-lime underline decoration-lime/40 underline-offset-4">
          МОНЕТИЗАЦИИ
        </span>
      </>
    ),
    desc: 'RevShare до 80%, CPA с кастомными ставками и Hybrid — под вашу стратегию и гео',
  },
  {
    title: (
      <>
        ПОДРОБНАЯ{' '}
        <span className="text-lime underline decoration-lime/40 underline-offset-4">
          СТАТИСТИКА
        </span>
      </>
    ),
    desc: 'Реал-тайм трекинг, постбэки, саб-ID, отчёты по FTD, удержанию и LTV',
  },
  {
    title: (
      <>
        МАТЕРИАЛЫ И{' '}
        <span className="text-lime underline decoration-lime/40 underline-offset-4">
          ПРОМО
        </span>
      </>
    ),
    desc: 'Готовые креативы, лендинги, pre-landers, виджеты, compliance-гайдлайны',
  },
];

export function WhySection() {
  return (
    <section
      id="about"
      className="relative bg-[#080C0A] py-24 overflow-hidden"
    >
      {/* Glow — right */}
      <div
        className="absolute top-0 right-0 w-[700px] h-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 100% 50%, rgba(20, 55, 15, 0.5) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* Heading */}
        <h2
          className="font-display font-black italic text-white text-center mb-20 tracking-tight"
          style={{ fontSize: 'clamp(1.6rem, 4vw, 3rem)' }}
        >
          ПОЧЕМУ ВЕБМАСТЕРА ВЫБИРАЮТ НАС
        </h2>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Features list */}
          <div className="space-y-12">
            {FEATURES.map((f, i) => (
              <div key={i} className="group">
                <h3 className="font-display font-bold italic text-white text-lg sm:text-xl mb-3 tracking-wide">
                  {f.title}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed max-w-xs">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Image placeholder */}
          <div className="flex items-center justify-center">
            <div
              className="w-full max-w-[480px] aspect-square rounded-3xl flex items-center justify-center border border-white/[0.06]"
              style={{
                background:
                  'radial-gradient(ellipse at 60% 40%, rgba(30,70,20,0.35) 0%, rgba(15,20,12,0.6) 70%)',
              }}
            >
              <div className="text-center text-white/20 select-none">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mx-auto mb-3 opacity-30"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M3 9h18M9 21V9"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <p className="text-xs tracking-widest uppercase">
                  Image placeholder
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
