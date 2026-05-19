"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DayActivity = { date: string; count: number };
type TopVacancy = { id: string; title: string; clientName: string; candidatesCount: number };
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  openVacancies: number;
  totalClients: number;
  hiredLast30Days: number;
};

type DashboardData = {
  openVacancies: number;
  totalCandidates: number;
  hiredLast30Days: number;
  conversion: number;
  topVacancies: TopVacancy[];
  activityLast7Days: DayActivity[];
  team?: TeamMember[];
};

function formatDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric" });
}

function BarChart({ data }: { data: DayActivity[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(({ date, count }) => {
        const pct = (count / max) * 100;
        return (
          <div key={date} className="flex-1 flex flex-col items-center gap-1.5 h-full">
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t-md bg-[#BA7517]/70 hover:bg-[#EF9F27]/80 transition-colors relative group"
                style={{ height: pct > 0 ? `${Math.max(pct, 8)}%` : "4px" }}
              >
                {count > 0 && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity bg-[#0f1117] px-1.5 py-0.5 rounded">
                    {count}
                  </span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">{formatDay(date)}</span>
          </div>
        );
      })}
    </div>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-[#151923] border border-white/5 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-full bg-[#BA7517]/20 flex items-center justify-center text-sm text-[#EF9F27] font-medium shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="text-sm text-white font-medium truncate">{member.name}</div>
          <div className="text-xs text-slate-500 truncate">{member.email}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#0f1117] rounded-lg p-2.5">
          <div className="text-lg font-semibold text-white">{member.openVacancies}</div>
          <div className="text-xs text-slate-500 mt-0.5">Вакансий</div>
        </div>
        <div className="bg-[#0f1117] rounded-lg p-2.5">
          <div className="text-lg font-semibold text-white">{member.totalClients}</div>
          <div className="text-xs text-slate-500 mt-0.5">Клиентов</div>
        </div>
        <div className="bg-[#0f1117] rounded-lg p-2.5">
          <div className="text-lg font-semibold text-[#EF9F27]">{member.hiredLast30Days}</div>
          <div className="text-xs text-slate-500 mt-0.5">Hired/мес</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const metrics = data
    ? [
        { label: "Открытых вакансий", value: data.openVacancies, sub: null },
        { label: "Кандидатов в базе", value: data.totalCandidates, sub: null },
        { label: "Hired за 30 дней", value: data.hiredLast30Days, sub: null },
        { label: "Конверсия", value: `${data.conversion}%`, sub: "hired / всего кандидатов" },
      ]
    : [];

  const isAdmin = !!data?.team;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Дашборд</h1>
        <p className="text-slate-400 text-sm mt-1">Общая сводка по платформе</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-[#151923] border border-white/5 rounded-xl p-5 animate-pulse">
                <div className="h-8 w-16 bg-white/5 rounded mb-2" />
                <div className="h-3 w-28 bg-white/5 rounded" />
              </div>
            ))
          : metrics.map((m) => (
              <div key={m.label} className="bg-[#151923] border border-white/5 rounded-xl p-5">
                <div className="text-3xl font-semibold text-white mb-1">{m.value}</div>
                <div className="text-sm text-slate-400">{m.label}</div>
                {m.sub && <div className="text-xs text-slate-600 mt-0.5">{m.sub}</div>}
              </div>
            ))}
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4 mb-8">
        {/* Top vacancies */}
        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-white">Топ вакансии по кандидатам</h2>
            <p className="text-xs text-slate-500 mt-0.5">Открытые, с наибольшим количеством заявок</p>
          </div>
          <div className="divide-y divide-white/5">
            {loading && <div className="py-12 text-center text-slate-500 text-sm">Загрузка...</div>}
            {!loading && (data?.topVacancies?.length ?? 0) === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">Нет открытых вакансий</div>
            )}
            {!loading && data?.topVacancies?.map((v, i) => (
              <div
                key={v.id}
                onClick={() => router.push(`/vacancies/${v.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <span className="text-slate-600 text-sm font-mono w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{v.title}</div>
                  <div className="text-xs text-slate-400">{v.clientName}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-slate-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-slate-300">{v.candidatesCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity chart */}
        <div className="bg-[#151923] border border-white/5 rounded-xl p-5">
          <div className="mb-5">
            <h2 className="text-sm font-medium text-white">Активность</h2>
            <p className="text-xs text-slate-500 mt-0.5">Кандидатов добавлено за 7 дней</p>
          </div>
          {loading ? (
            <div className="h-32 flex items-end gap-2">
              {[40, 65, 30, 80, 50, 70, 45].map((h, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-md animate-pulse" style={{ height: `${h}%` }} />
              ))}
            </div>
          ) : (
            <BarChart data={data?.activityLast7Days ?? []} />
          )}
          <div className="mt-4 pt-4 border-t border-white/5">
            <span className="text-xs text-slate-500">
              Всего за 7 дней:{" "}
              <span className="text-slate-300 font-medium">
                {data?.activityLast7Days.reduce((s, d) => s + d.count, 0) ?? 0}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Team section — admin only */}
      {(isAdmin || (loading && !data)) && (
        <div>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Команда</h2>
            <p className="text-slate-400 text-sm mt-0.5">Показатели рекрутеров за месяц</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#151923] border border-white/5 rounded-xl p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-white/5" />
                    <div className="flex-1">
                      <div className="h-3 w-24 bg-white/5 rounded mb-2" />
                      <div className="h-3 w-32 bg-white/5 rounded" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((j) => <div key={j} className="bg-[#0f1117] rounded-lg p-2.5 h-14" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : data?.team && data.team.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {data.team.map((member) => <TeamCard key={member.id} member={member} />)}
            </div>
          ) : (
            <div className="bg-[#151923] border border-white/5 rounded-xl py-12 text-center text-slate-500 text-sm">
              Нет активных рекрутеров
            </div>
          )}
        </div>
      )}
    </div>
  );
}
