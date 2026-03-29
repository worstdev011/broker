interface StatCardProps {
  title: string;
  value: string | number;
  color?: "default" | "green" | "yellow" | "red" | "blue";
  skeleton?: boolean;
}

const COLOR_MAP: Record<NonNullable<StatCardProps["color"]>, string> = {
  default: "text-admin-primary",
  green: "text-success",
  yellow: "text-warning",
  red: "text-danger",
  blue: "text-accent",
};

export function StatCard({
  title,
  value,
  color = "default",
  skeleton = false,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
      {skeleton ? (
        <>
          <div className="mb-2 h-8 w-24 animate-pulse rounded-md bg-white/5" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-white/5" />
        </>
      ) : (
        <>
          <p className={`text-2xl font-bold tabular-nums ${COLOR_MAP[color]}`}>
            {value}
          </p>
          <p className="mt-1.5 text-sm text-admin-secondary">{title}</p>
        </>
      )}
    </div>
  );
}
