"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Badge } from "@/components/ui/Badge";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/api/admin-api";
import type { AdminInstrumentDTO, InstrumentsListResponse } from "@/types/admin";

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      disabled={disabled}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-success" : "bg-white/10",
      ].join(" ")}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-[3px]",
        ].join(" ")}
      />
    </button>
  );
}

// ─── Payout editor ────────────────────────────────────────────────────────────

function PayoutEditor({
  instrumentId,
  currentValue,
  onSave,
  onCancel,
}: {
  instrumentId: string;
  currentValue: number;
  onSave: (id: string, value: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(String(currentValue));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 60 || num > 90) return;
    setSaving(true);
    await onSave(instrumentId, num);
    setSaving(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") onCancel();
  }

  const num = parseInt(val, 10);
  const invalid = isNaN(num) || num < 60 || num > 90;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        type="number"
        min={60}
        max={90}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={handleKey}
        autoFocus
        className={[
          "w-16 rounded-lg border px-2 py-1 text-center text-sm text-admin-primary outline-none",
          invalid
            ? "border-danger/50 bg-danger/5"
            : "border-accent bg-admin-base focus:ring-1 focus:ring-accent",
        ].join(" ")}
      />
      <button
        onClick={() => void handleSave()}
        disabled={invalid || saving}
        title="Сохранить"
        className="rounded p-1 text-success transition hover:bg-success/10 disabled:opacity-40"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      </button>
      <button
        onClick={onCancel}
        title="Отмена"
        className="rounded p-1 text-admin-secondary transition hover:bg-white/5 hover:text-admin-primary"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>
      {invalid && val !== "" && (
        <span className="text-xs text-danger">60–90</span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<AdminInstrumentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toasts, showToast, dismiss } = useToast();

  const load = useCallback(() => {
    setIsLoading(true);
    adminApi
      .get<InstrumentsListResponse>("/api/admin/instruments")
      .then(({ instruments: list }) => { setInstruments(list); setError(null); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toggle (optimistic) ──────────────────────────────────────────────────
  async function handleToggle(instrument: AdminInstrumentDTO) {
    const original = instrument.isActive;
    setInstruments((prev) =>
      prev.map((i) => i.id === instrument.id ? { ...i, isActive: !i.isActive } : i),
    );
    try {
      await adminApi.patch(`/api/instruments/${instrument.id}/toggle`, {});
    } catch (e) {
      setInstruments((prev) =>
        prev.map((i) => i.id === instrument.id ? { ...i, isActive: original } : i),
      );
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  // ── Payout ───────────────────────────────────────────────────────────────
  async function handleSavePayout(id: string, value: number) {
    try {
      await adminApi.patch(`/api/instruments/${id}/payout`, { payoutPercent: value });
      setInstruments((prev) =>
        prev.map((i) => i.id === id ? { ...i, payoutPercent: value } : i),
      );
      setEditingId(null);
      showToast("Доходность обновлена", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Ошибка", "error");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Инструменты">
      {error && (
        <div className="mb-4 rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-surface">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border">
                {["Название", "Тип", "Статус", "Доходность %", "Действия"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-secondary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-admin-border last:border-0">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : instruments.length === 0
                ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-admin-secondary">
                        Инструменты не найдены
                      </td>
                    </tr>
                  )
                : instruments.map((instr) => (
                    <tr
                      key={instr.id}
                      className="border-b border-admin-border last:border-0 transition-colors hover:bg-white/[0.02]"
                    >
                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-admin-primary">
                        {instr.name}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <Badge
                          variant={instr.type === "OTC" ? "warning" : "info"}
                          text={instr.type}
                        />
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            checked={instr.isActive}
                            onChange={() => void handleToggle(instr)}
                          />
                          <span className={instr.isActive ? "text-success" : "text-admin-muted"}>
                            {instr.isActive ? "Вкл" : "Выкл"}
                          </span>
                        </div>
                      </td>

                      {/* Payout */}
                      <td className="px-4 py-3">
                        {editingId === instr.id ? (
                          <PayoutEditor
                            instrumentId={instr.id}
                            currentValue={instr.payoutPercent}
                            onSave={handleSavePayout}
                            onCancel={() => setEditingId(null)}
                          />
                        ) : (
                          <span className="font-mono font-semibold text-admin-primary">
                            {instr.payoutPercent}%
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {editingId !== instr.id && (
                          <button
                            onClick={() => setEditingId(instr.id)}
                            className="rounded-lg border border-admin-border px-3 py-1.5 text-xs text-admin-secondary transition hover:border-accent/40 hover:text-accent"
                          >
                            Изменить %
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </AdminLayout>
  );
}
