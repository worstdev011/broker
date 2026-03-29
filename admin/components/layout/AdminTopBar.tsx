"use client";

import { useAdminAuth } from "@/components/providers/AdminAuthProvider";

interface AdminTopBarProps {
  title: string;
}

export function AdminTopBar({ title }: AdminTopBarProps) {
  const { admin, logout } = useAdminAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-admin-border bg-admin-surface px-6">
      {/* Page title */}
      <h1 className="text-sm font-semibold text-admin-primary">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {admin && (
          <span className="text-sm text-admin-secondary">{admin.email}</span>
        )}

        <button
          onClick={() => void logout()}
          className="flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 text-sm text-admin-secondary transition-colors hover:border-danger/40 hover:text-danger"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
              clipRule="evenodd"
            />
            <path
              fillRule="evenodd"
              d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.085a.75.75 0 1 0-1.004-1.115l-2.5 2.25a.75.75 0 0 0 0 1.115l2.5 2.25a.75.75 0 1 0 1.004-1.115l-1.048-1.085h9.546A.75.75 0 0 0 19 10Z"
              clipRule="evenodd"
            />
          </svg>
          Выйти
        </button>
      </div>
    </header>
  );
}
