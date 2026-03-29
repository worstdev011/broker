"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { adminApi } from "@/lib/api/admin-api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminWithdrawalDTO {
  id: string;
  amount: string;
  status: "PENDING" | "PAID" | "REJECTED";
  paymentMethod: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
  partner: { id: string; email: string; refCode: string };
}

interface WithdrawalsListResponse {
  withdrawals: AdminWithdrawalDTO[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_BADGE: Record<AdminWithdrawalDTO["status"], { variant: "warning" | "success" | "danger"; label: string }> = {
  PENDING:  { variant: "warning", label: "Ожидает" },
  PAID:     { variant: "success", label: "Выплачено" },
  REJECTED: { variant: "danger",  label: "Отклонено" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalType = "pay" | "reject";

const PAGE_SIZE = 50;

export default function AdminPartnerWithdrawalsPage() {
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "PAID" | "REJECTED" | "">( "PENDING");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WithdrawalsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modal, setModal] = useState<{ type: ModalType; wd: AdminWithdrawalDTO } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback((status: string, p: number) => {
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
    if (status) params.set("status", status);

    adminApi
      .get<WithdrawalsListResponse>(`/api/admin/partners/withdrawals?${params.toString()}`)
      .then((res) => { setData(res); setError(null); })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Ошибка загрузки");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(statusFilter, page); }, [statusFilter, page, load]);

  function openModal(type: ModalType, wd: AdminWithdrawalDTO) {
    setModal({ type, wd });
    setRejectNote("");
    setActionError(null);
  }

  async function handleAction() {
    if (!modal) return;

    try {
      if (modal.type === "pay") {
        await adminApi.patch(`/api/admin/partners/withdrawals/${modal.wd.id}/pay`, {});
      } else {
        if (!rejectNote.trim()) {
          setActionError("Укажите причину отклонения");
          throw new Error("validation");
        }
        await adminApi.patch(`/api/admin/partners/withdrawals/${modal.wd.id}/reject`, {
          note: rejectNote.trim(),
        });
      }
      setModal(null);
      load(statusFilter, page);
    } catch (err) {
      if (err instanceof Error && err.message !== "validation") {
        setActionError(err.message);
        throw err; // let ConfirmModal catch and stop spinner
      }
      if (err instanceof Error && err.message === "validation") {
        throw err;
      }
    }
  }

  const columns: TableColumn<AdminWithdrawalDTO>[] = [
    {
      key: "partner",
      header: "Партнёр",
      render: (w) => (
        <div>
          <p className="text-sm font-medium">{w.partner.email}</p>
          <p className="text-xs text-admin-secondary font-mono">{w.partner.refCode}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Сумма",
      render: (w) => (
        <span className="font-mono text-sm font-semibold">
          {Number(w.amount).toFixed(2)} UAH
        </span>
      ),
    },
    {
      key: "paymentMethod",
      header: "Реквизиты",
      render: (w) => (
        <span className="text-sm text-admin-secondary max-w-[200px] block truncate" title={w.paymentMethod ?? ""}>
          {w.paymentMethod ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Дата запроса",
      render: (w) => (
        <span className="text-sm text-admin-secondary">{fmtDate(w.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Статус",
      render: (w) => {
        const cfg = STATUS_BADGE[w.status];
        return <Badge variant={cfg.variant} text={cfg.label} />;
      },
    },
    {
      key: "actions",
      header: "Действия",
      render: (w) => {
        if (w.status !== "PENDING") {
          return (
            <span className="text-xs text-admin-muted">
              {w.note ? `Причина: ${w.note}` : "—"}
            </span>
          );
        }
        return (
          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); openModal("pay", w); }}
              className="rounded-lg border border-success/30 px-3 py-1 text-xs text-success transition hover:bg-success/10"
            >
              Выплатить
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openModal("reject", w); }}
              className="rounded-lg border border-danger/30 px-3 py-1 text-xs text-danger transition hover:bg-danger/10"
            >
              Отклонить
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout title="Выводы партнёров">
      {/* Filter tabs */}
      <div className="mb-4 flex items-center gap-2">
        {(["PENDING", "PAID", "REJECTED", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={[
              "rounded-lg px-4 py-1.5 text-sm transition",
              statusFilter === s
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-admin-secondary hover:text-admin-primary hover:bg-white/5 border border-transparent",
            ].join(" ")}
          >
            {s === "PENDING" ? "Ожидающие" : s === "PAID" ? "Выплаченные" : s === "REJECTED" ? "Отклонённые" : "Все"}
          </button>
        ))}
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

      <DataTable<AdminWithdrawalDTO>
        columns={columns}
        data={data?.withdrawals ?? []}
        isLoading={isLoading}
        emptyText="Запросов на вывод нет"
        keyExtractor={(w) => w.id}
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

      {/* Pay modal */}
      <ConfirmModal
        isOpen={modal?.type === "pay"}
        title="Подтвердить выплату"
        message={`Отметить выплату ${modal?.wd.amount} UAH для ${modal?.wd.partner.email}?`}
        confirmText="Выплатить"
        onConfirm={handleAction}
        onCancel={() => setModal(null)}
      />

      {/* Reject modal */}
      <ConfirmModal
        isOpen={modal?.type === "reject"}
        title="Отклонить заявку"
        message={`Заявка на ${modal?.wd.amount} UAH от ${modal?.wd.partner.email}. Средства вернутся на баланс партнёра.`}
        confirmText="Отклонить"
        cancelText="Назад"
        danger
        onConfirm={handleAction}
        onCancel={() => setModal(null)}
      >
        <div className="space-y-1">
          <label className="text-xs text-admin-secondary">Причина отклонения *</label>
          <textarea
            value={rejectNote}
            onChange={(e) => { setRejectNote(e.target.value); setActionError(null); }}
            placeholder="Укажите причину..."
            rows={3}
            className="w-full rounded-lg border border-admin-border bg-admin-base px-3 py-2 text-sm text-admin-primary placeholder-admin-muted focus:border-accent/60 focus:outline-none resize-none"
          />
          {actionError && (
            <p className="text-xs text-danger">{actionError}</p>
          )}
        </div>
      </ConfirmModal>
    </AdminLayout>
  );
}
