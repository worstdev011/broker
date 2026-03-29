type BadgeVariant = "success" | "danger" | "warning" | "info" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  text: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-success/10 text-success border-success/20",
  danger:  "bg-danger/10  text-danger  border-danger/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  info:    "bg-accent/10  text-accent   border-accent/20",
  default: "bg-white/5    text-admin-secondary border-white/10",
};

export function Badge({ variant = "default", text }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASSES[variant]}`}
    >
      {text}
    </span>
  );
}
