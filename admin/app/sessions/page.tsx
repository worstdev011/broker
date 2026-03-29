"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { adminApi } from "@/lib/api/admin-api";
import type { SessionsResponse } from "@/types/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

type WsConnection = SessionsResponse["connections"][number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}с назад`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}м назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч назад`;
  return `${Math.floor(hours / 24)}д назад`;
}

// ─── Table columns ────────────────────────────────────────────────────────────

const COLUMNS: TableColumn<WsConnection>[] = [
  {
    key: "email",
    header: "Email юзера",
    render: (c) => <span className="text-sm">{c.email}</span>,
  },
  {
    key: "userId",
    header: "ID юзера",
    render: (c) => (
      <span className="font-mono text-xs text-admin-secondary">
        {c.userId.slice(0, 8)}
      </span>
    ),
  },
  {
    key: "connectedAt",
    header: "Подключён",
    render: (c) => (
      <span className="text-sm text-admin-secondary">{timeAgo(c.connectedAt)}</span>
    ),
  },
  {
    key: "subscriptions",
    header: "Подписки",
    render: (c) =>
      c.subscriptions.length > 0 ? (
        <span className="text-sm text-admin-secondary">
          {c.subscriptions.join(", ")}
        </span>
      ) : (
        <span className="text-admin-muted">—</span>
      ),
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const REFRESH_MS = 10_000;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track "now" so timeAgo values update visually between fetches
  const [, setTick] = useState(0);

  const load = useCallback(() => {
    adminApi
      .get<SessionsResponse>("/api/admin/sessions")
      .then((res) => { setData(res); setIsLoading(false); })
      .catch(() => { setIsLoading(false); });
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => {
      load();
      setTick((t) => t + 1); // force re-render so timeAgo strings update
    }, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const connections = data?.connections ?? [];

  return (
    <AdminLayout title="Сессии">
      {/* ── Online counter ────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-5 py-4">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
          </span>
          <span className="text-sm text-admin-secondary">Онлайн сейчас:</span>
          <span className="text-2xl font-bold text-success">
            {data ? data.activeConnections : "—"}
          </span>
        </div>

        <span className="text-xs text-admin-muted">
          Обновляется каждые 10 сек
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <DataTable<WsConnection>
        columns={COLUMNS}
        data={connections}
        isLoading={isLoading}
        emptyText="Нет активных подключений"
        keyExtractor={(c) => `${c.userId}-${c.connectedAt}`}
      />
    </AdminLayout>
  );
}
