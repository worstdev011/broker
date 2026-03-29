interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, sub, accent, trend }: StatCardProps) {
  return (
    <div
      className={[
        'relative rounded-2xl border p-5 flex flex-col gap-2 overflow-hidden transition-all duration-200 hover:scale-[1.01]',
        accent
          ? 'bg-accent/[0.07] border-accent/25 shadow-lime-sm hover:shadow-lime-md'
          : 'bg-d-surface border-d-border hover:border-d-border2',
      ].join(' ')}
    >
      {/* Subtle glow blob for accent cards */}
      {accent && (
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-accent/10 blur-2xl pointer-events-none" />
      )}

      <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-muted">
        {label}
      </span>

      <span
        className={[
          'font-display font-black leading-none',
          accent ? 'text-accent' : 'text-primary',
        ].join(' ')}
        style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
      >
        {value}
      </span>

      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-0.5">
          {sub && <span className="text-xs text-muted">{sub}</span>}
          {trend && (
            <span
              className={[
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                trend.up ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10',
              ].join(' ')}
            >
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
