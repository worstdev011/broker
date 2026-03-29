"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { adminApi } from "@/lib/api/admin-api";
import type { AdminUserDTO, UsersListResponse } from "@/types/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtBalance(raw: string): string {
  return Number(raw).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShortId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    void navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span className="flex items-center gap-1.5 font-mono text-xs">
      <span className="text-admin-secondary">{id.slice(0, 8)}</span>
      <button
        onClick={copy}
        title="Копировать ID"
        className="text-admin-muted transition hover:text-accent"
      >
        {copied ? (
          <svg className="h-3.5 w-3.5 text-success" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z" />
            <path d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z" />
          </svg>
        )}
      </button>
    </span>
  );
}

function KycBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-admin-muted">—</span>;
  const map: Record<string, { variant: "success" | "danger" | "warning"; label: string }> = {
    VERIFIED: { variant: "success", label: "Verified" },
    REJECTED: { variant: "danger",  label: "Rejected" },
    PENDING:  { variant: "warning", label: "Pending"  },
  };
  const cfg = map[status] ?? { variant: "warning" as const, label: status };
  return <Badge variant={cfg.variant} text={cfg.label} />;
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: TableColumn<AdminUserDTO>[] = [
  {
    key: "id",
    header: "ID",
    render: (u) => <ShortId id={u.id} />,
  },
  {
    key: "email",
    header: "Email",
    render: (u) => <span className="text-sm">{u.email}</span>,
  },
  {
    key: "nickname",
    header: "Никнейм",
    render: (u) => (
      <span className="text-admin-secondary">{u.nickname ?? "—"}</span>
    ),
  },
  {
    key: "realBalance",
    header: "Реальный баланс",
    render: (u) => (
      <span className="font-mono text-sm">{fmtBalance(u.realBalance)}</span>
    ),
  },
  {
    key: "kycStatus",
    header: "KYC",
    render: (u) => <KycBadge status={u.kycStatus} />,
  },
  {
    key: "isActive",
    header: "Статус",
    render: (u) =>
      u.isActive ? (
        <Badge variant="success" text="Активен" />
      ) : (
        <Badge variant="danger" text="Забанен" />
      ),
  },
  {
    key: "createdAt",
    header: "Дата рег.",
    render: (u) => (
      <span className="text-sm text-admin-secondary">{fmtDate(u.createdAt)}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    render: (u) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          // parent row click handles navigation, this is a visual affordance
        }}
        className="rounded-lg border border-admin-border px-3 py-1 text-xs text-admin-secondary transition hover:border-accent/40 hover:text-accent"
        title={u.id}
      >
        Открыть
      </button>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<UsersListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (q: string, p: number) => {
      setIsLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("search", q);

      adminApi
        .get<UsersListResponse>(`/api/admin/users?${params.toString()}`)
        .then((res) => {
          setData(res);
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        })
        .finally(() => setIsLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(search, page);
  }, [search, page, load]);

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const totalPages = data ? data.totalPages : 1;

  return (
    <AdminLayout title="Пользователи">
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Поиск по ID, email, никнейму…"
        />
        {data && !isLoading && (
          <span className="ml-auto text-sm text-admin-secondary">
            Всего: {data.total.toLocaleString()}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable<AdminUserDTO>
        columns={COLUMNS}
        data={data?.users ?? []}
        isLoading={isLoading}
        emptyText="Пользователи не найдены"
        keyExtractor={(u) => u.id}
        onRowClick={(u) => router.push(`/users/${u.id}`)}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Назад
          </button>

          <span className="text-sm text-admin-secondary">
            Страница {page} из {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Вперёд →
          </button>
        </div>
      )}
    </AdminLayout>
  );
}
