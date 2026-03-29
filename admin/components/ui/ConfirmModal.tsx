"use client";

import { useState } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  danger?: boolean;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  onConfirm,
  onCancel,
  danger = false,
  children,
}: ConfirmModalProps) {
  const [isPending, setIsPending] = useState(false);

  if (!isOpen) return null;

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => { if (!isPending) onCancel(); }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-xl border border-admin-border bg-admin-surface shadow-2xl">
        <div className="p-6">
          <h2 className="text-base font-semibold text-admin-primary">{title}</h2>
          <p className="mt-2 text-sm text-admin-secondary">{message}</p>

          {children && <div className="mt-4">{children}</div>}
        </div>

        <div className="flex justify-end gap-3 border-t border-admin-border px-6 py-4">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-admin-border px-4 py-2 text-sm text-admin-secondary transition hover:text-admin-primary disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className={[
              "flex min-w-[100px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60",
              danger
                ? "bg-danger hover:bg-danger-hover"
                : "bg-accent hover:bg-accent-hover",
            ].join(" ")}
          >
            {isPending ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
              </svg>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
