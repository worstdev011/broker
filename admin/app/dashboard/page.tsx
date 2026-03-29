"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard } from "@/components/ui/StatCard";
import { adminApi } from "@/lib/api/admin-api";
import type { DashboardResponse } from "@/types/admin";

const REFRESH_INTERVAL_MS = 30_000;

function fmt(n: number): string {
  return n.toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardResponse["stats"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .get<DashboardResponse>("/api/admin/dashboard")
      .then(({ stats: s }) => {
        setStats(s);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const skeleton = stats === null && error === null;

  return (
    <AdminLayout title="Dashboard">
      {error && (
        <div className="mb-6 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Row 1 */}
        <StatCard
          title="Всего пользователей"
          value={stats ? stats.usersTotal.toLocaleString() : ""}
          skeleton={skeleton}
        />
        <StatCard
          title="Онлайн сейчас"
          value={stats ? stats.activeNow.toLocaleString() : ""}
          color="blue"
          skeleton={skeleton}
        />
        <StatCard
          title="Открытых сделок"
          value={stats ? stats.tradesOpenNow.toLocaleString() : ""}
          skeleton={skeleton}
        />
        <StatCard
          title="Pending выводов"
          value={stats ? stats.pendingWithdrawals.toLocaleString() : ""}
          color={
            stats && stats.pendingWithdrawals > 0 ? "yellow" : "default"
          }
          skeleton={skeleton}
        />

        {/* Row 2 */}
        <StatCard
          title="Депозиты сегодня, UAH"
          value={stats ? fmt(stats.depositsToday) : ""}
          color="green"
          skeleton={skeleton}
        />
        <StatCard
          title="Выводы сегодня, UAH"
          value={stats ? fmt(stats.withdrawalsToday) : ""}
          color="green"
          skeleton={skeleton}
        />
        <StatCard
          title="Объём торгов сегодня, UAH"
          value={stats ? fmt(stats.volumeToday) : ""}
          color="green"
          skeleton={skeleton}
        />
        <StatCard
          title="Новых пользователей сегодня"
          value={stats ? stats.usersToday.toLocaleString() : ""}
          skeleton={skeleton}
        />
      </div>
    </AdminLayout>
  );
}
