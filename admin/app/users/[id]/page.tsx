"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/api/admin-api";
import type {
  AdminTradeDTO,
  AdminTransactionDTO,
  AdminSessionDTO,
  UserDetailResponse,
} from "@/types/admin";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtMoney(raw: string | number): string {
  return Number(raw).toLocaleString("uk-UA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function initials(email: string): string {
  return email.charAt(0).toUpperCase();
}

function truncate(s: string | null, n = 60): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// ─── Table column definitions ─────────────────────────────────────────────────

const TRADE_COLS: TableColumn<AdminTradeDTO>[] = [
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
        <Badge variant="info" text="CALL" />
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

const TX_COLS: TableColumn<AdminTransactionDTO>[] = [
  {
    key: "type",
    header: "Тип",
    render: (t) => (
      <Badge
        variant={t.type === "DEPOSIT" ? "success" : "warning"}
        text={t.type === "DEPOSIT" ? "Депозит" : "Вывод"}
      />
    ),
  },
  {
    key: "amount",
    header: "Сумма",
    render: (t) => (
      <span className="font-mono text-sm">
        {fmtMoney(t.amount)} {t.currency}
      </span>
    ),
  },
  {
    key: "status",
    header: "Статус",
    render: (t) => {
      const map = { PENDING: "warning", CONFIRMED: "success", FAILED: "danger" } as const;
      return <Badge variant={map[t.status]} text={t.status} />;
    },
  },
  {
    key: "paymentMethod",
    header: "Метод",
    render: (t) => (
      <span className="text-sm text-admin-secondary">{t.paymentMethod}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Дата",
    render: (t) => (
      <span className="text-sm text-admin-secondary">{fmtDate(t.createdAt)}</span>
    ),
  },
];

const SESSION_COLS: TableColumn<AdminSessionDTO>[] = [
  {
    key: "ipAddress",
    header: "IP",
    render: (s) => (
      <span className="font-mono text-sm">{s.ipAddress ?? "—"}</span>
    ),
  },
  {
    key: "userAgent",
    header: "Устройство",
    render: (s) => (
      <span className="text-sm text-admin-secondary" title={s.userAgent ?? ""}>
        {truncate(s.userAgent, 55)}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: "Создана",
    render: (s) => (
      <span className="text-sm text-admin-secondary">{fmtDate(s.createdAt)}</span>
    ),
  },
  {
    key: "expiresAt",
    header: "Истекает",
    render: (s) => (
      <span className="text-sm text-admin-secondary">{fmtDate(s.expiresAt)}</span>
    ),
  },
];

// ─── Modal state type ─────────────────────────────────────────────────────────

type ModalType =
  | "ban"
  | "unban"
  | "reset-2fa"
  | "kill-sessions"
  | "adjust-balance"
  | "kyc"
  | null;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [banReason, setBanReason] = useState("");
  const [kycTarget, setKycTarget] = useState<"VERIFIED" | "REJECTED" | "PENDING">("VERIFIED");
  const [kycEditing, setKycEditing] = useState(false);

  // ── Balance form ────────────────────────────────────────────────────────────
  const [balForm, setBalForm] = useState({
    accountId: "",
    amount: "",
    direction: "CREDIT" as "CREDIT" | "DEBIT",
    reason: "",
  });

  // ── Toast ───────────────────────────────────────────────────────────────────
  const { toasts, showToast, dismiss } = useToast();

  // ── Load ────────────────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.get<UserDetailResponse>(`/api/admin/users/${id}`);
      setData(res);
      setFetchError(null);
      // Init balance form account
      setBalForm((prev) => {
        if (prev.accountId) return prev;
        const realAcc = res.accounts.find((a) => a.type === "REAL");
        return { ...prev, accountId: realAcc?.id ?? res.accounts[0]?.id ?? "" };
      });
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void reload(); }, [reload]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function doBan() {
    try {
      await adminApi.patch(`/api/admin/users/${id}/ban`, { reason: banReason || "Blocked by admin" });
      showToast("Пользователь заблокирован", "success");
      setBanReason("");
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  async function doUnban() {
    try {
      await adminApi.patch(`/api/admin/users/${id}/unban`, {});
      showToast("Пользователь разблокирован", "success");
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  async function doReset2FA() {
    try {
      await adminApi.patch(`/api/admin/users/${id}/reset-2fa`, {});
      showToast("2FA сброшена", "success");
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  async function doKillSessions() {
    try {
      await adminApi.delete(`/api/admin/users/${id}/sessions`);
      showToast("Все сессии удалены", "success");
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  function openBalanceModal() {
    if (!balForm.accountId) { showToast("Выберите счёт", "error"); return; }
    const amt = Number(balForm.amount);
    if (!balForm.amount || amt <= 0) { showToast("Введите сумму больше 0", "error"); return; }
    if (!balForm.reason.trim()) { showToast("Укажите причину", "error"); return; }
    setActiveModal("adjust-balance");
  }

  async function doAdjustBalance() {
    try {
      await adminApi.patch<{ success: true; newBalance: string }>(
        `/api/admin/users/${id}/balance`,
        {
          accountId: balForm.accountId,
          amount: Number(balForm.amount),
          direction: balForm.direction,
          reason: balForm.reason.trim(),
        },
      );
      showToast("Баланс изменён", "success");
      setBalForm((prev) => ({ ...prev, amount: "", reason: "" }));
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  async function doKyc() {
    try {
      await adminApi.patch(`/api/admin/users/${id}/kyc`, { status: kycTarget });
      showToast("KYC статус обновлён", "success");
      setKycEditing(false);
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
    setActiveModal(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading && !data) {
    return (
      <AdminLayout title="Пользователь">
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-border border-t-accent" />
        </div>
      </AdminLayout>
    );
  }

  if (fetchError && !data) {
    return (
      <AdminLayout title="Ошибка">
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {fetchError}
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  const { user, accounts, stats, recentTrades, recentTransactions, activeSessions } = data;

  const selectedAccount = accounts.find((a) => a.id === balForm.accountId);

  return (
    <AdminLayout title={user.email}>
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href="/users"
          className="text-sm text-admin-secondary transition hover:text-admin-primary"
        >
          ← Пользователи
        </Link>
      </div>

      {/* ─── User card ───────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-admin-border bg-admin-surface p-6">
        <div className="flex flex-wrap items-start gap-6">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatarUrl}
                alt={user.email}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              initials(user.email)
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-admin-primary">{user.email}</h2>
              {user.isActive ? (
                <Badge variant="success" text="Активен" />
              ) : (
                <Badge variant="danger" text="Забанен" />
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-admin-muted">ID</dt>
                <dd className="font-mono text-xs text-admin-secondary">{user.id.slice(0, 16)}…</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Никнейм</dt>
                <dd className="text-admin-secondary">{user.nickname ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Зарегистрирован</dt>
                <dd className="text-admin-secondary">{fmtDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">IP входа</dt>
                <dd className="font-mono text-xs text-admin-secondary">
                  {user.ipAddress ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {user.isActive ? (
              <button
                onClick={() => setActiveModal("ban")}
                className="rounded-lg border border-danger/30 px-3 py-1.5 text-sm text-danger transition hover:bg-danger/10"
              >
                Забанить
              </button>
            ) : (
              <button
                onClick={() => setActiveModal("unban")}
                className="rounded-lg border border-success/30 px-3 py-1.5 text-sm text-success transition hover:bg-success/10"
              >
                Разбанить
              </button>
            )}
            {user.twoFactorEnabled && (
              <button
                onClick={() => setActiveModal("reset-2fa")}
                className="rounded-lg border border-admin-border px-3 py-1.5 text-sm text-admin-secondary transition hover:border-warning/40 hover:text-warning"
              >
                Сбросить 2FA
              </button>
            )}
            <button
              onClick={() => setActiveModal("kill-sessions")}
              className="rounded-lg border border-admin-border px-3 py-1.5 text-sm text-admin-secondary transition hover:border-danger/40 hover:text-danger"
            >
              Убить сессии
            </button>
          </div>
        </div>
      </div>

      {/* ─── Accounts + KYC + Balance form ───────────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Accounts + KYC */}
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-admin-primary">Счета</h3>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between rounded-lg border border-admin-border px-4 py-3"
              >
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-admin-secondary">
                    {acc.type}
                  </span>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-admin-primary">
                    {fmtMoney(acc.balance)}{" "}
                    <span className="text-sm font-normal text-admin-secondary">{acc.currency}</span>
                  </p>
                </div>
                {acc.isActive && (
                  <Badge variant="info" text="Активный" />
                )}
              </div>
            ))}
          </div>

          {/* KYC */}
          <div className="mt-5 border-t border-admin-border pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-admin-secondary">KYC статус</span>
              <div className="flex items-center gap-2">
                {user.kycStatus ? (
                  <Badge
                    variant={
                      user.kycStatus === "VERIFIED"
                        ? "success"
                        : user.kycStatus === "REJECTED"
                        ? "danger"
                        : "warning"
                    }
                    text={user.kycStatus}
                  />
                ) : (
                  <span className="text-sm text-admin-muted">Не задан</span>
                )}
                <button
                  onClick={() => setKycEditing((v) => !v)}
                  className="text-xs text-accent hover:underline"
                >
                  {kycEditing ? "Отмена" : "Изменить"}
                </button>
              </div>
            </div>

            {kycEditing && (
              <div className="mt-3 flex gap-2">
                {(["VERIFIED", "REJECTED", "PENDING"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setKycTarget(s);
                      setActiveModal("kyc");
                    }}
                    className={[
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                      s === "VERIFIED"
                        ? "border-success/30 text-success hover:bg-success/10"
                        : s === "REJECTED"
                        ? "border-danger/30 text-danger hover:bg-danger/10"
                        : "border-warning/30 text-warning hover:bg-warning/10",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Balance adjustment */}
        <div className="rounded-xl border border-admin-border bg-admin-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-admin-primary">Изменить баланс</h3>
          <div className="space-y-3">
            {/* Account select */}
            <div>
              <label className="mb-1 block text-xs text-admin-secondary">Счёт</label>
              <select
                value={balForm.accountId}
                onChange={(e) => setBalForm((prev) => ({ ...prev, accountId: e.target.value }))}
                className="w-full rounded-lg border border-admin-border bg-admin-base px-3 py-2 text-sm text-admin-primary outline-none focus:border-accent"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.type} — {fmtMoney(a.balance)} {a.currency}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1 block text-xs text-admin-secondary">Сумма</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={balForm.amount}
                onChange={(e) => setBalForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full rounded-lg border border-admin-border bg-admin-base px-3 py-2 text-sm text-admin-primary outline-none focus:border-accent"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="mb-1 block text-xs text-admin-secondary">Операция</label>
              <div className="flex gap-3">
                {(["CREDIT", "DEBIT"] as const).map((dir) => (
                  <label
                    key={dir}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="direction"
                      value={dir}
                      checked={balForm.direction === dir}
                      onChange={() => setBalForm((prev) => ({ ...prev, direction: dir }))}
                      className="accent-accent"
                    />
                    <span className={dir === "CREDIT" ? "text-success" : "text-danger"}>
                      {dir === "CREDIT" ? "Пополнить" : "Списать"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1 block text-xs text-admin-secondary">Причина *</label>
              <textarea
                value={balForm.reason}
                onChange={(e) => setBalForm((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Причина изменения баланса…"
                rows={2}
                className="w-full resize-none rounded-lg border border-admin-border bg-admin-base px-3 py-2 text-sm text-admin-primary outline-none focus:border-accent"
              />
            </div>

            <button
              onClick={openBalanceModal}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Применить
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Всего сделок" value={stats.totalTrades.toLocaleString()} />
        <StatCard
          title="Win Rate"
          value={`${(stats.winRate * 100).toFixed(1)}%`}
          color={stats.winRate >= 0.5 ? "green" : "default"}
        />
        <StatCard
          title="Объём торгов"
          value={fmtMoney(stats.totalVolume)}
          color="green"
        />
        <StatCard
          title="Всего депозитов"
          value={fmtMoney(stats.totalDeposits)}
          color="green"
        />
      </div>

      {/* ─── Recent trades ───────────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-admin-primary">
          Последние сделки
        </h3>
        <DataTable<AdminTradeDTO>
          columns={TRADE_COLS}
          data={recentTrades}
          keyExtractor={(t) => t.id}
          emptyText="Сделок нет"
        />
      </section>

      {/* ─── Recent transactions ─────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-admin-primary">
          Последние транзакции
        </h3>
        <DataTable<AdminTransactionDTO>
          columns={TX_COLS}
          data={recentTransactions}
          keyExtractor={(t) => t.id}
          emptyText="Транзакций нет"
        />
      </section>

      {/* ─── Active sessions ─────────────────────────────────────────────── */}
      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-admin-primary">
          Активные сессии{" "}
          <span className="ml-1 text-admin-secondary">({activeSessions.length})</span>
        </h3>
        <DataTable<AdminSessionDTO>
          columns={SESSION_COLS}
          data={activeSessions}
          keyExtractor={(s) => s.id}
          emptyText="Активных сессий нет"
        />
      </section>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {/* Ban */}
      <ConfirmModal
        isOpen={activeModal === "ban"}
        title="Забанить пользователя"
        message={`Пользователь ${user.email} будет заблокирован. Все активные сессии и WS-соединения будут закрыты.`}
        confirmText="Забанить"
        danger
        onConfirm={doBan}
        onCancel={() => setActiveModal(null)}
      >
        <div>
          <label className="mb-1 block text-xs text-admin-secondary">Причина блокировки</label>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Опишите причину блокировки…"
            rows={2}
            className="w-full resize-none rounded-lg border border-admin-border bg-admin-base px-3 py-2 text-sm text-admin-primary outline-none focus:border-danger"
          />
        </div>
      </ConfirmModal>

      {/* Unban */}
      <ConfirmModal
        isOpen={activeModal === "unban"}
        title="Разблокировать пользователя"
        message={`Пользователь ${user.email} будет разблокирован и сможет снова войти.`}
        confirmText="Разблокировать"
        onConfirm={doUnban}
        onCancel={() => setActiveModal(null)}
      />

      {/* Reset 2FA */}
      <ConfirmModal
        isOpen={activeModal === "reset-2fa"}
        title="Сбросить двухфакторную аутентификацию"
        message={`2FA будет отключена для ${user.email}. Пользователь сможет настроить заново.`}
        confirmText="Сбросить 2FA"
        danger
        onConfirm={doReset2FA}
        onCancel={() => setActiveModal(null)}
      />

      {/* Kill sessions */}
      <ConfirmModal
        isOpen={activeModal === "kill-sessions"}
        title="Удалить все сессии"
        message={`Все активные сессии пользователя ${user.email} будут удалены. WS-соединения закрыты.`}
        confirmText="Удалить сессии"
        danger
        onConfirm={doKillSessions}
        onCancel={() => setActiveModal(null)}
      />

      {/* Adjust balance */}
      <ConfirmModal
        isOpen={activeModal === "adjust-balance"}
        title="Подтвердить изменение баланса"
        message={`${balForm.direction === "CREDIT" ? "Пополнение" : "Списание"} ${balForm.amount} на счёт ${selectedAccount?.type ?? ""} (${selectedAccount?.currency ?? ""}). Причина: ${balForm.reason}`}
        confirmText="Применить"
        onConfirm={doAdjustBalance}
        onCancel={() => setActiveModal(null)}
      />

      {/* KYC */}
      <ConfirmModal
        isOpen={activeModal === "kyc"}
        title="Изменить KYC статус"
        message={`Новый статус для ${user.email}: ${kycTarget}`}
        confirmText="Сохранить"
        onConfirm={doKyc}
        onCancel={() => { setActiveModal(null); setKycEditing(false); }}
      />

      {/* ─── Toasts ──────────────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </AdminLayout>
  );
}
