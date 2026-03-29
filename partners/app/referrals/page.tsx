'use client';

import { useEffect, useState, useCallback } from 'react';
import { PartnersLayout } from '@/components/layout/PartnersLayout';
import { DataTable } from '@/components/ui/DataTable';
import { partnersApi, ApiError } from '@/lib/api/partners-api';
import type { PartnerReferralDTO } from '@/types/partners';

const PAGE_SIZE = 50;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ReferralsPage() {
  const [rows, setRows]   = useState<PartnerReferralDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await partnersApi.getReferrals(p, PAGE_SIZE);
      setRows(res.referrals);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) setError('Не удалось загрузить рефералов');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PartnersLayout>
      <div className="space-y-5 max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black italic text-2xl text-white tracking-tight">Рефералы</h1>
            <p className="text-xs text-muted mt-1">Привлечённые пользователи</p>
          </div>
          <div className="bg-d-surface border border-d-border rounded-xl px-4 py-2 text-center">
            <p className="text-[10px] text-muted uppercase tracking-wider">Всего</p>
            <p className="font-display font-black text-xl text-accent leading-none">{total}</p>
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <DataTable
          loading={loading}
          columns={[
            {
              header: 'ID',
              accessor: (r) => (
                <span className="font-mono text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-lg">
                  {r.id.slice(0, 8)}
                </span>
              ),
            },
            {
              header: 'Регистрация',
              accessor: (r) => <span className="text-secondary text-xs">{fmt(r.registeredAt)}</span>,
            },
            {
              header: 'Первый депозит',
              accessor: (r) =>
                r.ftdAt ? (
                  <div>
                    <span className="text-accent text-sm font-semibold">{r.ftdAmount} ₴</span>
                    <span className="text-muted text-xs ml-2">{fmt(r.ftdAt)}</span>
                  </div>
                ) : (
                  <span className="text-muted text-xs">—</span>
                ),
            },
            {
              header: 'Сделок',
              accessor: (r) => <span className="font-medium">{r.totalTrades}</span>,
            },
            {
              header: 'Принёс',
              accessor: (r) => (
                <span className={parseFloat(r.earned) > 0 ? 'text-accent font-semibold' : 'text-muted'}>
                  {parseFloat(r.earned) > 0 ? `${r.earned} ₴` : '—'}
                </span>
              ),
            },
            {
              header: 'Активность',
              accessor: (r) => (
                <span className="text-secondary text-xs">
                  {r.lastActiveAt ? fmt(r.lastActiveAt) : '—'}
                </span>
              ),
            },
          ]}
          rows={rows}
          keyFn={(r) => r.id}
          empty="У вас пока нет рефералов. Поделитесь реферальной ссылкой!"
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 rounded-xl border border-d-border text-xs text-secondary hover:text-primary hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Назад
            </button>
            <span className="text-xs text-muted">
              <span className="text-primary font-bold">{page}</span> / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 rounded-xl border border-d-border text-xs text-secondary hover:text-primary hover:border-accent/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Вперёд →
            </button>
          </div>
        )}
      </div>
    </PartnersLayout>
  );
}
