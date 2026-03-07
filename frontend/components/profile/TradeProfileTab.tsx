'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, ChevronDown, Calendar } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '@/lib/api/api';
import { getInstrument } from '@/lib/instruments';

interface BalancePoint {
  date: string;
  balance: number;
}

interface TradeStatistics {
  totalTrades: number;
  winRate: number;
  totalVolume: number;
  netProfit: number;
  winCount: number;
  lossCount: number;
  tieCount: number;
  maxTrade: { amount: number; date: string } | null;
  minTrade: { amount: number; date: string } | null;
  bestProfit: { profit: number; date: string } | null;
}

interface TradeAnalytics {
  byInstrument: Array<{ instrument: string; count: number; volume: number; winCount: number }>;
  byDirection: {
    call: { count: number; winCount: number };
    put: { count: number; winCount: number };
  };
}

interface TradeHistoryItem {
  id: string;
  direction: string;
  instrument: string;
  amount: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  payout: string;
  entryPrice: string;
  exitPrice: string | null;
}

const PRESET_INTERVALS = [
  { id: '24h', label: '24 часа', days: 1 },
  { id: 'all', label: 'Всё время', days: null },
];

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatBalance(v: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function StatLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      <span className="group/tip relative inline-flex cursor-help">
        <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors" strokeWidth={2} />
        <span className="absolute left-0 bottom-full mb-1.5 px-2.5 py-1.5 bg-[#0f1a2e] border border-white/10 rounded-lg text-xs text-white/80 max-w-[200px] opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all z-20 shadow-xl pointer-events-none">
          {hint}
        </span>
      </span>
    </div>
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function instrumentLabel(id: string): string {
  const info = getInstrument(id) || getInstrument(`${id}_REAL`);
  return info?.label ?? id.replace(/_REAL$/, '').replace(/([A-Z]{3})([A-Z]{3})/, '$1/$2');
}

export function TradeProfileTab() {
  const today = new Date();
  const defaultEnd = toDateStr(today);
  const defaultStart = toDateStr(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));

  const [interval, setInterval] = useState<string>('24h');
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(defaultEnd);
  const [history, setHistory] = useState<BalancePoint[]>([]);
  const [stats, setStats] = useState<TradeStatistics | null>(null);
  const [analytics, setAnalytics] = useState<TradeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [tradesRaw, setTradesRaw] = useState<TradeHistoryItem[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);

  const isCustom = interval === 'custom';

  useEffect(() => {
    let startStr: string;
    let endStr: string;

    if (isCustom) {
      startStr = customStart;
      endStr = customEnd;
    } else {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      endStr = toDateStr(end);

      const preset = PRESET_INTERVALS.find((i) => i.id === interval);
      if (preset?.days === null) {
        startStr = '2020-01-01';
      } else {
        const days = preset?.days ?? 30;
        const start = new Date();
        start.setDate(start.getDate() - days);
        start.setHours(0, 0, 0, 0);
        startStr = toDateStr(start);
      }
    }

    setChartLoading(true);
    setAnalyticsLoading(true);
    setTradesLoading(true);
    Promise.all([
      api<{ history: BalancePoint[] }>(
        `/api/trades/balance-history?startDate=${startStr}&endDate=${endStr}`
      ).then((res) => setHistory(res.history || [])).catch(() => setHistory([])),
      api<{ analytics: TradeAnalytics }>(
        `/api/trades/analytics?startDate=${startStr}&endDate=${endStr}`
      ).then((res) => setAnalytics(res.analytics || null)).catch(() => setAnalytics(null)),
      api<{ trades: TradeHistoryItem[] }>(
        `/api/trades?limit=100&offset=0&status=closed`
      ).then((res) => setTradesRaw(res.trades || [])).catch(() => setTradesRaw([])),
    ]).finally(() => {
      setChartLoading(false);
      setAnalyticsLoading(false);
      setTradesLoading(false);
    });
  }, [interval, customStart, customEnd]);

  useEffect(() => {
    setLoading(true);
    api<{ statistics: TradeStatistics }>('/api/trades/statistics')
      .then((res) => setStats(res.statistics))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const chartData = history.map((p) => ({
    ...p,
    displayDate: formatDate(p.date),
  }));

  const { startStr, endStr } = (() => {
    if (isCustom) return { startStr: customStart, endStr: customEnd };
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const endStrVal = toDateStr(end);
    const preset = PRESET_INTERVALS.find((i) => i.id === interval);
    const startStrVal = preset?.days === null ? '2020-01-01' : (() => {
      const days = preset?.days ?? 30;
      const start = new Date();
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      return toDateStr(start);
    })();
    return { startStr: startStrVal, endStr: endStrVal };
  })();

  const filteredTrades = tradesRaw.filter((t) => {
    const dateStr = (t.closedAt || t.openedAt).slice(0, 10);
    return dateStr >= startStr && dateStr <= endStr;
  });

  return (
    <div className="flex w-full min-h-[calc(100vh-3.5rem)] relative">
      {/* Фоновый градиент */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_120%_80%_at_20%_0%,rgba(51,71,255,0.06),transparent_50%)]" />

      {/* Основная часть */}
      <div className="flex-1 min-w-0 p-3 sm:p-6 md:p-8 overflow-auto relative">
        <div className="w-full">
          <div className="mb-4 sm:mb-10">
            <h1 className="text-lg sm:text-3xl font-bold text-white tracking-tight">Торговый профиль</h1>
            <p className="text-sm text-white/50 mt-1">
              Статистика и динамика баланса
            </p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
            <div className="group rounded-xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-5 hover:bg-white/[0.04] transition-all">
              <StatLabel label="МАКС. ПРИБЫЛЬ" hint="Максимальная прибыль от одной сделки за выбранный период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats?.bestProfit ? formatBalance(stats.bestProfit.profit) : '0.00'} UAH
                </p>
              )}
            </div>

            <div className="group rounded-xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-5 hover:bg-white/[0.04] transition-all">
              <StatLabel label="ОБЪЁМ ТОРГОВ" hint="Суммарный объём всех сделок за период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats ? formatBalance(stats.totalVolume) : '0.00'} UAH
                </p>
              )}
            </div>

            <div className="group rounded-xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-5 hover:bg-white/[0.04] transition-all">
              <StatLabel label="СДЕЛОК" hint="Количество закрытых сделок за период" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats?.totalTrades ?? 0}
                </p>
              )}
            </div>

            <div className="group rounded-xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-5 hover:bg-white/[0.04] transition-all">
              <StatLabel label="% УСПЕШНЫХ" hint="Win rate — процент прибыльных сделок от общего числа" />
              {loading ? (
                <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-base sm:text-xl font-bold text-white tabular-nums">
                  {stats ? `${stats.winRate}%` : '0%'}
                </p>
              )}
            </div>
          </div>

          {/* Средняя секция: Динамика баланса + Распределение по активам */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Динамика баланса */}
            <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-4">Динамика баланса</h2>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mb-4">
                <div className="flex gap-2">
                  {PRESET_INTERVALS.map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setInterval(i.id)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                        interval === i.id && !isCustom
                          ? 'bg-[#3347ff] text-white'
                          : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/10'
                      }`}
                    >
                      {i.label}
                      {interval === i.id && !isCustom && <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setInterval('custom')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all ${
                      isCustom ? 'bg-[#3347ff] text-white' : 'bg-white/5 text-white/60 hover:text-white/80 border border-white/10'
                    }`}
                  >
                    Свой период
                  </button>
                </div>
                {isCustom && (
                  <div className="flex items-center gap-2 ml-auto">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer">
                      <Calendar className="w-3.5 h-3.5 text-white/50" />
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        max={customEnd}
                        className="bg-transparent text-white/80 text-xs focus:outline-none w-24"
                      />
                    </label>
                    <span className="text-white/40">—</span>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer">
                      <Calendar className="w-3.5 h-3.5 text-white/50" />
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        min={customStart}
                        max={toDateStr(new Date())}
                        className="bg-transparent text-white/80 text-xs focus:outline-none w-24"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="h-[220px] sm:h-[260px]">
                {chartLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                  </div>
                ) : chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-white/40 text-sm">
                    Нет данных за выбранный период
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis
                        dataKey="displayDate"
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(3, 14, 40, 0.98)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          padding: '10px 14px',
                        }}
                        labelStyle={{ color: '#fff', fontSize: 13, fontWeight: 600 }}
                        itemStyle={{ color: '#fff', fontSize: 13 }}
                        cursor={false}
                        formatter={(value: number | undefined) => [value != null ? `${formatBalance(value)} UAH` : '', 'Баланс']}
                        labelFormatter={(label) => label}
                      />
                      <Bar
                        dataKey="balance"
                        fill="#3347ff"
                        radius={[4, 4, 0, 0]}
                        activeBar={{ fill: '#5b6bff', stroke: 'rgba(91, 107, 255, 0.5)', strokeWidth: 1 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Распределение по активам */}
            <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
              <h2 className="text-base font-semibold text-white mb-4">Распределение по активам</h2>
              {analyticsLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
                </div>
              ) : !analytics?.byInstrument?.length ? (
                <div className="h-[260px] flex items-center justify-center text-white/40 text-sm">
                  Нет данных за выбранный период
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.byInstrument.slice(0, 8).map((i) => ({
                        name: instrumentLabel(i.instrument),
                        count: i.count,
                        volume: i.volume,
                        winRate: i.count > 0 ? Math.round((i.winCount / i.count) * 100) : 0,
                      }))}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        stroke="rgba(255,255,255,0.3)"
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(3, 14, 40, 0.98)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          padding: '10px 14px',
                        }}
                        labelStyle={{ color: '#fff', fontSize: 13, fontWeight: 600 }}
                        itemStyle={{ color: '#fff', fontSize: 13 }}
                        cursor={false}
                        formatter={(value: number | undefined) => [value != null ? `${value} сделок` : '', 'Количество']}
                      />
                      <Bar
                        dataKey="count"
                        fill="#3347ff"
                        radius={[0, 4, 4, 0]}
                        activeBar={{ fill: '#5b6bff', stroke: 'rgba(91, 107, 255, 0.5)', strokeWidth: 1 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* История сделок */}
          <div className="rounded-xl sm:rounded-2xl border border-white/[0.08] bg-[#030E28] p-4 sm:p-6">
            <h2 className="text-base font-semibold text-white mb-4">История сделок</h2>
            {tradesLoading ? (
              <div className="h-[120px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#3347ff] rounded-full animate-spin" />
              </div>
            ) : filteredTrades.length === 0 ? (
              <div className="h-[120px] flex items-center justify-center text-white/40 text-sm">
                Нет данных за выбранный период
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-dropdown">
                <table className="w-full text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Дата</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Актив</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Направление</th>
                      <th className="text-left py-3 px-4 text-white/50 font-medium">Статус</th>
                      <th className="text-right py-3 px-4 text-white/50 font-medium">Результат</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t) => {
                      const amt = parseFloat(t.amount);
                      const payout = parseFloat(t.payout);
                      const isWin = t.status === 'WIN';
                      const isLoss = t.status === 'LOSS';
                      const result = isWin ? amt * payout : isLoss ? -amt : 0;
                      return (
                        <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-3 px-4 text-white/80">
                            {new Date(t.closedAt || t.openedAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-white/80">
                            {instrumentLabel(t.instrument)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              t.direction === 'CALL'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}>
                              {t.direction === 'CALL' ? 'Купить' : 'Продать'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={
                              isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-amber-400'
                            }>
                              {isWin ? 'Прибыль' : isLoss ? 'Убыток' : 'Возврат'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium tabular-nums">
                            <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-amber-400'}>
                              {isWin ? '+' : ''}{result.toFixed(0)} UAH
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
