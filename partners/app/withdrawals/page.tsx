'use client';

import { useEffect, useState, useCallback } from 'react';
import { PartnersLayout } from '@/components/layout/PartnersLayout';
import { DataTable } from '@/components/ui/DataTable';
import { partnersApi, ApiError } from '@/lib/api/partners-api';
import type { PartnerWithdrawalDTO, WithdrawalsResponse } from '@/types/partners';

const STATUS: Record<PartnerWithdrawalDTO['status'], { label: string; cls: string }> = {
  PENDING:  { label: 'Ожидает',   cls: 'bg-warning/10 text-warning border border-warning/20' },
  PAID:     { label: 'Выплачено', cls: 'bg-accent/10 text-accent border border-accent/20' },
  REJECTED: { label: 'Отклонено', cls: 'bg-danger/10 text-danger border border-danger/20' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function WithdrawalsPage() {
  const [data, setData]       = useState<WithdrawalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount]     = useState('');
  const [method, setMethod]     = useState('');
  const [formErr, setFormErr]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk]             = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await partnersApi.getWithdrawals()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const balance = parseFloat(data?.balance ?? '0');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setOk(null);
    const n = parseFloat(amount);
    if (isNaN(n) || n < 500)      return setFormErr('Минимум 500 ₴');
    if (n > balance)               return setFormErr('Превышает баланс');
    if (!method.trim())            return setFormErr('Укажите реквизиты');
    setSubmitting(true);
    try {
      await partnersApi.requestWithdrawal(n, method.trim());
      setOk('Заявка отправлена!');
      setShowForm(false);
      setAmount('');
      setMethod('');
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormErr(err.status === 409 ? 'Уже есть активная заявка' : 'Ошибка сервера');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PartnersLayout>
      <div className="space-y-5 max-w-3xl">

        {/* Balance hero */}
        <div className="relative bg-d-surface border border-d-border rounded-2xl p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-accent/[0.04] rounded-full blur-3xl pointer-events-none" />
          <p className="text-[10px] text-muted uppercase tracking-[0.12em] mb-2">Доступно к выводу</p>
          <div className="flex items-end gap-4 mb-5">
            <span className="font-display font-black text-accent leading-none" style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
              {loading ? '—' : `${data?.balance ?? '0'}`}
            </span>
            <span className="text-secondary font-semibold text-lg mb-1">₴</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={loading || balance < 500}
              onClick={() => { setShowForm((v) => !v); setFormErr(null); }}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-d-bg font-bold text-xs tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lime-sm hover:shadow-lime-md"
            >
              {showForm ? 'ОТМЕНА' : 'ЗАПРОСИТЬ ВЫВОД'}
            </button>
            <span className="text-[11px] text-muted">Минимум 500 ₴</span>
          </div>
        </div>

        {/* Success */}
        {ok && (
          <div className="bg-accent/10 border border-accent/25 text-accent text-sm rounded-xl px-4 py-3">
            ✓ {ok}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-d-surface border border-d-border rounded-2xl p-6 space-y-4">
            <h2 className="font-display font-bold text-sm text-white tracking-wide">Новая заявка</h2>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider mb-1.5 block">Сумма (₴)</label>
              <input
                type="number" min={500} max={balance} step={0.01}
                value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="Минимум 500"
                className="w-full bg-d-raised border border-d-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/40 transition"
              />
              <p className="text-[10px] text-muted mt-1">Доступно: {balance.toFixed(2)} ₴</p>
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-wider mb-1.5 block">Реквизиты</label>
              <textarea
                value={method} onChange={(e) => setMethod(e.target.value)}
                placeholder="Карта, крипто-кошелёк или другие реквизиты"
                rows={3}
                className="w-full bg-d-raised border border-d-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent/40 transition resize-none"
              />
            </div>
            {formErr && (
              <p className="text-danger text-xs bg-danger/10 border border-danger/20 rounded-xl px-3 py-2">{formErr}</p>
            )}
            <button
              type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-d-bg font-bold text-xs tracking-widest disabled:opacity-50 transition-all shadow-lime-sm hover:shadow-lime-md"
            >
              {submitting ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ЗАЯВКУ'}
            </button>
          </form>
        )}

        {/* History */}
        <div>
          <p className="text-[10px] text-muted uppercase tracking-[0.12em] mb-3">История выводов</p>
          <DataTable
            loading={loading}
            columns={[
              { header: 'Дата',    accessor: (w) => <span className="text-secondary text-xs">{fmt(w.createdAt)}</span> },
              { header: 'Сумма',   accessor: (w) => <span className="font-display font-bold text-sm">{w.amount} ₴</span> },
              {
                header: 'Реквизиты',
                accessor: (w) => (
                  <span className="text-secondary text-xs">
                    {w.paymentMethod ? w.paymentMethod.slice(0, 30) + (w.paymentMethod.length > 30 ? '…' : '') : '—'}
                  </span>
                ),
              },
              {
                header: 'Статус',
                accessor: (w) => {
                  const c = STATUS[w.status];
                  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${c.cls}`}>{c.label}</span>;
                },
              },
              { header: 'Комментарий', accessor: (w) => <span className="text-muted text-xs">{w.note ?? '—'}</span> },
            ]}
            rows={data?.withdrawals ?? []}
            keyFn={(w) => w.id}
            empty="История выводов пуста"
          />
        </div>

      </div>
    </PartnersLayout>
  );
}
