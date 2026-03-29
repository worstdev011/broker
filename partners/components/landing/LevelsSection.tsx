const LEVELS = [
  { name: 'НОВИЧОК',     percent: '30%', range: '0–4 FTD' },
  { name: 'БАЗОВЫЙ',     percent: '50%', range: '5–24 FTD' },
  { name: 'ПРОДВИНУТЫЙ', percent: '60%', range: '25–59 FTD' },
  { name: 'ПРОФИ',       percent: '70%', range: '60–149 FTD' },
  { name: 'VIP',         percent: '80%', range: '150+ FTD' },
];

export function LevelsSection() {
  return (
    <section className="relative bg-[#080C0A] py-24 overflow-hidden">
      {/* Centre glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(25,65,15,0.55) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">

        <h2
          className="font-display font-black italic text-white text-center mb-16 tracking-tight"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
        >
          ПАРТНЁРСКИЕ УРОВНИ
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {LEVELS.map((lvl) => (
            <div
              key={lvl.name}
              className="flex flex-col rounded-2xl border border-white/[0.07] bg-[#0D120B] px-5 py-6"
            >
              <p className="font-display font-bold text-white text-sm tracking-wider mb-4">
                {lvl.name}
              </p>
              <p
                className="font-display font-black text-lime leading-none mb-5"
                style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
              >
                {lvl.percent}
              </p>
              <div className="flex items-center gap-1.5 mt-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-lime/70 shrink-0" />
                <span className="text-white/40 text-xs">{lvl.range}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
