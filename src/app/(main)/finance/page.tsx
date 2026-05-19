"use client";

import { useEffect, useState } from "react";

type ByRow = { id: string; name: string; commission: number; count: number };
type VacancyRow = {
  id: string;
  title: string;
  clientName: string;
  recruiterName: string;
  commissionType: string;
  commissionValue: number;
  commission: number;
  status: string;
  salaryTo: number | null;
};
type FinanceData = {
  total: number;
  byClient: ByRow[];
  byRecruiter: ByRow[];
  byVacancy: VacancyRow[];
};

const PERIODS = [
  { label: "Этот месяц", value: "month" },
  { label: "3 месяца", value: "3months" },
  { label: "6 месяцев", value: "6months" },
  { label: "Этот год", value: "year" },
  { label: "За всё время", value: "all" },
];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Открыта", ON_HOLD: "На паузе", CLOSED: "Закрыта", FILLED: "Укомплектована",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-[#EF9F27]/15 text-[#EF9F27]",
  ON_HOLD: "bg-amber-500/15 text-amber-400",
  CLOSED: "bg-slate-500/15 text-slate-400",
  FILLED: "bg-[#EF9F27]/15 text-[#EF9F27]",
};

const fmt = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function getPeriodDates(period: string): { from?: string; to?: string } {
  const now = new Date();
  if (period === "all") return {};
  const from = new Date();
  if (period === "month") from.setMonth(now.getMonth(), 1);
  else if (period === "3months") from.setMonth(now.getMonth() - 2, 1);
  else if (period === "6months") from.setMonth(now.getMonth() - 5, 1);
  else if (period === "year") from.setMonth(0, 1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: new Date(now.setHours(23, 59, 59, 999)).toISOString() };
}

export default function FinancePage() {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = getPeriodDates(period);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/finance?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  const vacancyCount = data?.byVacancy.length ?? 0;
  const clientCount = data?.byClient.length ?? 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Финансы</h1>
          <p className="text-slate-400 text-sm mt-1">Ожидаемые комиссионные без НДС</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors focus:outline-none appearance-none cursor-pointer"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} className="bg-[#151923] text-white">{p.label}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div className="bg-[#151923] border border-white/5 rounded-xl p-6">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Ожидаемый доход</div>
          <div className="text-3xl font-bold text-white">
            {loading ? "—" : fmt.format(data?.total ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">без НДС</div>
        </div>
        <div className="bg-[#151923] border border-white/5 rounded-xl p-6">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Вакансий</div>
          <div className="text-3xl font-bold text-white">{loading ? "—" : vacancyCount}</div>
          <div className="text-xs text-slate-500 mt-1">с комиссией</div>
        </div>
        <div className="bg-[#151923] border border-white/5 rounded-xl p-6">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Клиентов</div>
          <div className="text-3xl font-bold text-white">{loading ? "—" : clientCount}</div>
          <div className="text-xs text-slate-500 mt-1">уникальных</div>
        </div>
      </div>

      {/* By client + by recruiter */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* By client */}
        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">По клиентам</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-slate-500 text-sm">Загрузка...</div>
          ) : !data?.byClient.length ? (
            <div className="py-10 text-center text-slate-500 text-sm">Нет данных</div>
          ) : (
            data.byClient.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm text-white">{row.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{row.count} вак.</div>
                </div>
                <div className="text-sm font-medium text-[#EF9F27]">{fmt.format(row.commission)}</div>
              </div>
            ))
          )}
        </div>

        {/* By recruiter */}
        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">По рекрутерам</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-slate-500 text-sm">Загрузка...</div>
          ) : !data?.byRecruiter.length ? (
            <div className="py-10 text-center text-slate-500 text-sm">Нет данных</div>
          ) : (
            data.byRecruiter.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm text-white">{row.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{row.count} вак.</div>
                </div>
                <div className="text-sm font-medium text-[#EF9F27]">{fmt.format(row.commission)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* By vacancy */}
      <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/5">
          <h2 className="text-sm font-medium text-white">По вакансиям</h2>
        </div>

        {!loading && (data?.byVacancy.length ?? 0) > 0 && (
          <div className="flex items-center px-5 py-2.5 border-b border-white/5">
            <div className="flex-1 min-w-0 text-xs font-medium text-slate-500 uppercase tracking-wider">Вакансия</div>
            <div style={{ width: 160, flexShrink: 0 }} className="text-xs font-medium text-slate-500 uppercase tracking-wider">Клиент</div>
            <div style={{ width: 140, flexShrink: 0 }} className="text-xs font-medium text-slate-500 uppercase tracking-wider">Рекрутер</div>
            <div style={{ width: 200, flexShrink: 0 }} className="text-xs font-medium text-slate-500 uppercase tracking-wider">Комиссия</div>
            <div style={{ width: 120, flexShrink: 0 }} className="text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</div>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-slate-500 text-sm">Загрузка...</div>
        ) : !data?.byVacancy.length ? (
          <div className="py-10 text-center text-slate-500 text-sm">Нет вакансий за выбранный период</div>
        ) : (
          data.byVacancy.map((v) => (
            <div key={v.id} className="flex items-center px-5 py-3.5 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0 pr-4">
                <div className="text-sm text-white truncate">{v.title}</div>
              </div>
              <div style={{ width: 160, flexShrink: 0 }} className="text-sm text-slate-400 truncate pr-3">{v.clientName}</div>
              <div style={{ width: 140, flexShrink: 0 }} className="text-sm text-slate-400 truncate pr-3">{v.recruiterName}</div>
              <div style={{ width: 200, flexShrink: 0 }}>
                {v.commissionType === "PERCENTAGE" ? (
                  <div>
                    <span className="text-sm font-medium text-[#EF9F27]">{fmt.format(v.commission)}</span>
                    <span className="text-xs text-slate-500 ml-1.5">({v.commissionValue}% × 12 мес.)</span>
                  </div>
                ) : (
                  <span className="text-sm font-medium text-[#EF9F27]">{fmt.format(v.commission)}</span>
                )}
              </div>
              <div style={{ width: 120, flexShrink: 0 }}>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[v.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                  {STATUS_LABEL[v.status] ?? v.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
