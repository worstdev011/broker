'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { PartnersLayout } from '@/components/layout/PartnersLayout';
import { StatCard } from '@/components/ui/StatCard';
import { LineChart } from '@/components/ui/LineChart';
import { partnersApi, ApiError } from '@/lib/api/partners-api';
import type { PartnerDashboardDTO } from '@/types/partners';

type Metric = 'clicks' | 'registrations' | 'ftd' | 'earnings';

const TABS: { key: Metric; label: string }[] = [
  { key: 'clicks',        label: 'Клики' },
  { key: 'registrations', label: 'Регистрации' },
  { key: 'ftd',           label: 'FTD' },
  { key: 'earnings',      label: 'Заработок' },
];

export default function DashboardPage() {
  const [data, setData] = useState<PartnerDashboardDTO | null>(null);
  const [metric, setMetric] = useState<Metric>('clicks');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await partnersApi.getDashboard());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status !== 401) setError('Не удалось загрузить данные');
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 60_000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(data.refUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const s = data?.stats;

  return (
    <PartnersLayout>
      <div className="space-y-6 max-w-6xl">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display font-black italic text-2xl text-white tracking-tight">
              Дашборд
            </h1>
            <p className="text-xs text-muted mt-1">Обзор партнёрской программы</p>
          </div>
          {s && (
            <div className="text-right">
              <p className="text-[10px] text-muted uppercase tracking-wider">Активных рефералов</p>
              <p className="font-display font-black text-xl text-accent">{s.activeReferrals}</p>
            </div>
          )}
        </div>

        {/* Ref link */}
        <div className="bg-d-surface border border-d-border rounded-2xl p-5">
          <p className="text-[10px] text-muted uppercase tracking-[0.12em] mb-3">
            Реферальная ссылка
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-d-raised border border-d-border rounded-xl px-4 py-2.5 text-sm font-mono text-primary truncate select-all">
              {data?.refUrl ?? '—'}
            </div>
            <button
              onClick={copyLink}
              disabled={!data}
              className={[
                'shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold tracking-widest transition-all',
                copied
                  ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                  : 'bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 hover:shadow-lime-sm',
              ].join(' ')}
            >
              {copied ? '✓ СКОПИРОВАНО' : 'КОПИРОВАТЬ'}
            </button>
          </div>
          <p className="text-[11px] text-muted mt-2.5">
            За каждого реферала — <span className="text-accent font-semibold">50% RevShare</span> от прибыли брокера
          </p>
        </div>

        {/* Stats today */}
        <div>
          <p className="text-[10px] text-muted uppercase tracking-[0.12em] mb-3">Сегодня</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Клики"       value={s?.clicksToday        ?? '—'} />
            <StatCard label="Регистрации" value={s?.registrationsToday ?? '—'} />
            <StatCard label="FTD"         value={s?.ftdToday            ?? '—'} />
            <StatCard label="Заработок"   value={s ? `${s.earningsToday} ₴` : '—'} accent />
          </div>
        </div>

        {/* Stats total */}
        <div>
          <p className="text-[10px] text-muted uppercase tracking-[0.12em] mb-3">За всё время</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Клики всего"       value={s?.clicksTotal        ?? '—'} />
            <StatCard label="Регистрации всего" value={s?.registrationsTotal ?? '—'} />
            <StatCard label="FTD всего"         value={s?.ftdTotal            ?? '—'} />
            <StatCard label="Баланс к выводу"   value={s ? `${s.balance} ₴` : '—'} accent />
          </div>
        </div>

        {/* Conversion */}
        {s && (
          <div className="bg-d-surface border border-d-border rounded-2xl px-5 py-4 flex items-center justify-between">
            <span className="text-xs text-secondary">Конверсия reg → FTD</span>
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-32 bg-d-raised rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all shadow-[0_0_8px_rgba(197,255,71,0.6)]"
                  style={{ width: `${Math.min(s.conversionRate, 100)}%` }}
                />
              </div>
              <span className="font-display font-black text-accent text-lg">
                {s.conversionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-d-surface border border-d-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-primary">Динамика за 30 дней</p>
            <div className="flex gap-1 bg-d-raised rounded-xl p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMetric(tab.key)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    metric === tab.key
                      ? 'bg-accent text-d-bg shadow-lime-sm'
                      : 'text-secondary hover:text-primary',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52">
            {data && data.chartData.length > 0 ? (
              <LineChart data={data.chartData} metric={metric} />
            ) : (
              <div className="h-full flex items-center justify-center text-secondary text-sm">
                {data ? 'Нет данных' : (
                  <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-danger text-sm bg-danger/10 border border-danger/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

      </div>
    </PartnersLayout>
  );
}
