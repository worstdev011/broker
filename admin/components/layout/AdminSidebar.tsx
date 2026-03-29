"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm10 0a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V4ZM2 14a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2Zm10-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-4Z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM17 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 0 0-1.5-4.33A5 5 0 0 1 19 16v1h-6.07ZM6 11a5 5 0 0 1 5 5v1H1v-1a5 5 0 0 1 5-5Z" />
    </svg>
  );
}

function IconTrades({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M12 7a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8.414l-4.293 4.293a1 1 0 0 1-1.414 0L8 10.414l-4.293 4.293a1 1 0 0 1-1.414-1.414l5-5a1 1 0 0 1 1.414 0L11 10.586 14.586 7H12Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconInstruments({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 3.5a1.5 1.5 0 0 1 3 0V4a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-.5a1.5 1.5 0 0 0 0 3h.5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-.5a1.5 1.5 0 0 0-3 0v.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1h-.5a1.5 1.5 0 0 1 0-3H4a1 1 0 0 0 1-1V6a1 1 0 0 1 1-1h3a1 1 0 0 0 1-1v-.5Z" />
    </svg>
  );
}

function IconSessions({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M7 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H7Zm3 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconPartners({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM15.22 15.126A4.002 4.002 0 0 0 10 12a4.002 4.002 0 0 0-5.22 3.126A.75.75 0 0 0 5.5 16h9a.75.75 0 0 0 .72-.874ZM18 16h-1.21a5.97 5.97 0 0 0-1.55-3.076A3.5 3.5 0 0 1 18 16ZM3.21 16A3.5 3.5 0 0 1 4.76 12.924 5.97 5.97 0 0 0 3.21 16H2a.75.75 0 0 0 .72.874H3.21Z" />
    </svg>
  );
}

function IconWithdrawals({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4ZM1 9.5a.5.5 0 0 1 .5-.5h17a.5.5 0 0 1 0 1H14v4.5a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5V10H1.5a.5.5 0 0 1-.5-.5Z" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/users", label: "Пользователи", Icon: IconUsers },
  { href: "/trades", label: "Сделки", Icon: IconTrades },
  { href: "/instruments", label: "Инструменты", Icon: IconInstruments },
  { href: "/sessions", label: "Сессии", Icon: IconSessions },
  { href: "/partners", label: "Партнёры", Icon: IconPartners },
  { href: "/partners/withdrawals", label: "Выводы партнёров", Icon: IconWithdrawals },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-admin-surface border-r border-admin-border">
      {/* Logo */}
      <div className="flex h-14 items-center px-5 border-b border-admin-border">
        <span className="text-xs font-bold uppercase tracking-widest text-accent">
          Comfortrade
        </span>
        <span className="ml-1 text-xs font-bold uppercase tracking-widest text-admin-secondary">
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-admin-secondary hover:bg-white/5 hover:text-admin-primary",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer version */}
      <div className="px-5 py-3 border-t border-admin-border">
        <p className="text-xs text-admin-muted">v1.0</p>
      </div>
    </aside>
  );
}
