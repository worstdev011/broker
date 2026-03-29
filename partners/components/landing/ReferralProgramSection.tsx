const FEATURES = [
  {
    title: 'СУБ-ПАРТНЁРЫ',
    desc: 'Получайте до 5% от комиссий ваших суб-партнёров и масштабируйте сеть.',
  },
  {
    title: 'ИНДИВИДУАЛЬНЫЕ УСЛОВИЯ',
    desc: 'Для лидеров предоставляем повышенные ставки и персональные офферы.',
  },
];

export function ReferralProgramSection() {
  return (
    <section className="relative bg-[#080C0A] py-24 overflow-hidden">
      {/* Right glow */}
      <div
        className="absolute top-0 right-0 w-[600px] h-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 100% 50%, rgba(20,55,15,0.45) 0%, transparent 65%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Image placeholder */}
          <div className="flex items-center justify-center order-2 lg:order-1">
            <div className="w-full max-w-[420px] aspect-square rounded-3xl bg-lime flex items-center justify-center overflow-hidden">
              <div className="text-center text-[#080C0A]/30 select-none">
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mx-auto mb-3"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <p className="text-xs tracking-widest uppercase font-bold">Image placeholder</p>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="order-1 lg:order-2">
            <h2
              className="font-display font-black italic text-white mb-12 tracking-tight leading-tight"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
            >
              РЕФЕРАЛЬНАЯ<br />ПРОГРАММА
            </h2>

            <div className="space-y-8">
              {FEATURES.map((f) => (
                <div key={f.title}>
                  <h3 className="font-display font-bold text-white text-sm tracking-widest mb-2 underline decoration-white/30 underline-offset-4 uppercase">
                    {f.title}
                  </h3>
                  <p className="text-white/45 text-sm leading-relaxed max-w-sm">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
