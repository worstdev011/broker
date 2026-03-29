"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { adminApi } from "@/lib/api/admin-api";
import type {
  AdminTradeDTO,
  AdminInstrumentDTO,
  TradesListResponse,
  ActiveTradesResponse,
  InstrumentsListResponse,
} from "@/types/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtMoney(raw: string): string {
  return Number(raw).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: TableColumn<AdminTradeDTO>[] = [
  {
    key: "id",
    header: "ID",
    render: (t) => (
      <span className="font-mono text-xs text-admin-secondary">{t.id.slice(0, 8)}</span>
    ),
  },
  {
    key: "userEmail",
    header: "Юзер",
    render: (t) => <span className="text-sm">{t.userEmail}</span>,
  },
  {
    key: "instrument",
    header: "Инструмент",
    render: (t) => <span className="font-medium">{t.instrument}</span>,
  },
  {
    key: "direction",
    header: "Направление",
    render: (t) =>
      t.direction === "CALL" ? (
        <Badge variant="success" text="CALL" />
      ) : (
        <Badge variant="danger" text="PUT" />
      ),
  },
  {
    key: "amount",
    header: "Сумма",
    render: (t) => (
      <span className="font-mono text-sm">{fmtMoney(t.amount)}</span>
    ),
  },
  {
    key: "status",
    header: "Статус",
    render: (t) => {
      const map = {
        OPEN: "info",
        WIN: "success",
        LOSS: "danger",
        TIE: "warning",
      } as const;
      return <Badge variant={map[t.status]} text={t.status} />;
    },
  },
  {
    key: "payoutPercent",
    header: "Payout%",
    render: (t) => (
      <span className="text-sm text-admin-secondary">{t.payoutPercent}%</span>
    ),
  },
  {
    key: "openedAt",
    header: "Открыта",
    render: (t) => (
      <span className="text-sm text-admin-secondary">{fmtDate(t.openedAt)}</span>
    ),
  },
  {
    key: "closedAt",
    header: "Закрыта",
    render: (t) => (
      <span className="text-sm text-admin-secondary">
        {t.closedAt ? fmtDate(t.closedAt) : "—"}
      </span>
    ),
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const ACTIVE_REFRESH_MS = 10_000;

type StatusFilter = "" | "OPEN" | "WIN" | "LOSS" | "TIE";

const DEFAULT_FILTERS = {
  status: "" as StatusFilter,
  instrument: "",
  userId: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  // ── Instruments list (for select) ──────────────────────────────────────────
  const [instruments, setInstruments] = useState<AdminInstrumentDTO[]>([]);

  useEffect(() => {
    adminApi
      .get<InstrumentsListResponse>("/api/admin/instruments")
      .then(({ instruments: list }) => setInstruments(list))
      .catch(() => {/* non-critical */});
  }, []);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  function setFilter<K extends keyof typeof DEFAULT_FILTERS>(
    key: K,
    value: (typeof DEFAULT_FILTERS)[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  const hasActiveFilters =
    filters.status !== "" ||
    filters.instrument !== "" ||
    filters.userId !== "";

  // ── Trades list ────────────────────────────────────────────────────────────
  const [data, setData] = useState<TradesListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((f: typeof filters, p: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (f.status)     params.set("status", f.status);
    if (f.instrument) params.set("instrument", f.instrument);
    if (f.userId)     params.set("userId", f.userId);

    adminApi
      .get<TradesListResponse>(`/api/admin/trades?${params.toString()}`)
      .then((res) => { setData(res); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(filters, page); }, [filters, page, load]);

  // ── Active trades counter ──────────────────────────────────────────────────
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const activeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadActive = useCallback(() => {
    adminApi
      .get<ActiveTradesResponse>("/api/admin/trades/active")
      .then(({ trades }) => setActiveCount(trades.length))
      .catch(() => {/* silent */});
  }, []);

  useEffect(() => {
    loadActive();
    activeTimer.current = setInterval(loadActive, ACTIVE_REFRESH_MS);
    return () => {
      if (activeTimer.current) clearInterval(activeTimer.current);
    };
  }, [loadActive]);

  const totalPages = data?.totalPages ?? 1;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Сделки">
      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value as StatusFilter)}
          className="rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-primary outline-none focus:border-accent"
        >
          <option value="">Все статусы</option>
          <option value="OPEN">OPEN</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="TIE">TIE</option>
        </select>

        {/* Instrument */}
        <select
          value={filters.instrument}
          onChange={(e) => setFilter("instrument", e.target.value)}
          className="rounded-lg border border-admin-border bg-admin-surface px-3 py-2.5 text-sm text-admin-primary outline-none focus:border-accent"
        >
          <option value="">Все инструменты</option>
          {instruments.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        {/* UserId search */}
        <SearchInput
          value={filters.userId}
          onChange={(v) => setFilter("userId", v)}
          placeholder="Поиск по userId…"
        />

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-2.5 text-sm text-admin-secondary transition hover:border-danger/40 hover:text-danger"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
            Сбросить
          </button>
        )}

        {/* Spacer + active counter */}
        <div className="ml-auto flex items-center gap-2">
          {activeCount !== null && (
            <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-admin-secondary">Открытых сделок сейчас:</span>
              <span className="font-semibold text-success">{activeCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <DataTable<AdminTradeDTO>
        columns={COLUMNS}
        data={data?.trades ?? []}
        isLoading={isLoading}
        emptyText="Сделки не найдены"
        keyExtractor={(t) => t.id}
      />

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Назад
          </button>

          <div className="flex items-center gap-3 text-sm text-admin-secondary">
            <span>Страница {page} из {totalPages}</span>
            {data && (
              <span className="text-admin-muted">
                ({data.total.toLocaleString()} сделок)
              </span>
            )}
          </div>

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
