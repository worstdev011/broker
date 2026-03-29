"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { adminApi, ApiError } from "@/lib/api/admin-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminPartnerDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  refCode: string;
  status: "ACTIVE" | "SUSPENDED";
  revsharePercent: number;
  balance: string;
  totalEarned: string;
  referralCount: number;
  createdAt: string;
}

interface PartnersListResponse {
  partners: AdminPartnerDTO[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function AdminPartnersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PartnersListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    partner: AdminPartnerDTO;
    action: "ACTIVE" | "SUSPENDED";
  } | null>(null);

  const load = useCallback((q: string, p: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (q) params.set("search", q);

    adminApi
      .get<PartnersListResponse>(`/api/admin/partners?${params.toString()}`)
      .then((res) => { setData(res); setError(null); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(search, page); }, [search, page, load]);

  async function toggleStatus() {
    if (!modal) return;
    await adminApi.patch(`/api/admin/partners/${modal.partner.id}/status`, {
      status: modal.action,
    });
    setModal(null);
    load(search, page);
  }

  const columns: TableColumn<AdminPartnerDTO>[] = [
    {
      key: "email",
      header: "Email",
      render: (p) => <span className="text-sm font-medium">{p.email}</span>,
    },
    {
      key: "refCode",
      header: "RefCode",
      render: (p) => (
        <span className="font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
          {p.refCode}
        </span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (p) =>
        p.status === "ACTIVE" ? (
          <Badge variant="success" text="Активен" />
        ) : (
          <Badge variant="danger" text="Приостановлен" />
        ),
    },
    {
      key: "balance",
      header: "Баланс",
      render: (p) => (
        <span className="font-mono text-sm">{Number(p.balance).toFixed(2)} UAH</span>
      ),
    },
    {
      key: "totalEarned",
      header: "Всего заработано",
      render: (p) => (
        <span className="font-mono text-sm text-admin-secondary">
          {Number(p.totalEarned).toFixed(2)} UAH
        </span>
      ),
    },
    {
      key: "referrals",
      header: "Рефералов",
      render: (p) => <span className="text-sm">{p.referralCount}</span>,
    },
    {
      key: "createdAt",
      header: "Дата",
      render: (p) => (
        <span className="text-sm text-admin-secondary">{fmtDate(p.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setModal({
              partner: p,
              action: p.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
            });
          }}
          className={[
            "rounded-lg border px-3 py-1 text-xs transition",
            p.status === "ACTIVE"
              ? "border-danger/30 text-danger hover:bg-danger/10"
              : "border-success/30 text-success hover:bg-success/10",
          ].join(" ")}
        >
          {p.status === "ACTIVE" ? "Приостановить" : "Активировать"}
        </button>
      ),
    },
  ];

  return (
    <AdminLayout title="Партнёры">
      <div className="mb-4 flex items-center gap-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Поиск по email или RefCode…"
        />
        {data && !isLoading && (
          <span className="ml-auto text-sm text-admin-secondary">
            Всего: {data.total}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <DataTable<AdminPartnerDTO>
        columns={columns}
        data={data?.partners ?? []}
        isLoading={isLoading}
        emptyText="Партнёры не найдены"
        keyExtractor={(p) => p.id}
      />

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Назад
          </button>
          <span className="text-sm text-admin-secondary">
            Страница {page} из {data.totalPages}
          </span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            Вперёд →
          </button>
        </div>
      )}

      {modal && (
        <ConfirmModal
          isOpen
          title={modal.action === "SUSPENDED" ? "Приостановить партнёра?" : "Активировать партнёра?"}
          message={`Партнёр: ${modal.partner.email} (${modal.partner.refCode})`}
          confirmText={modal.action === "SUSPENDED" ? "Приостановить" : "Активировать"}
          danger={modal.action === "SUSPENDED"}
          onConfirm={toggleStatus}
          onCancel={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
}
