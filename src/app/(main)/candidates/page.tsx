"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VacancyRef = {
  vacancy: {
    id: string;
    title: string;
    client: { name: string };
  };
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentPosition: string | null;
  experience: number | null;
  createdAt: string;
  applications: VacancyRef[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

function VacancyBadges({ applications }: { applications: VacancyRef[] }) {
  if (applications.length === 0) return <span className="text-slate-600">—</span>;

  const visible = applications.slice(0, 2);
  const rest = applications.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(({ vacancy }) => (
        <span
          key={vacancy.id}
          className="inline-flex flex-col bg-[#EF9F27]/10 text-xs px-2 py-1 rounded-md max-w-[180px]"
        >
          <span className="text-[#EF9F27] truncate leading-tight">{vacancy.title}</span>
          <span className="text-slate-500 truncate leading-tight">{vacancy.client.name}</span>
        </span>
      ))}
      {rest > 0 && (
        <span className="text-xs text-slate-500 px-1 py-0.5">+{rest}</span>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/candidates?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setCandidates(Array.isArray(data) ? data : []);
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query]);

  const count = candidates.length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Кандидаты</h1>
          <p className="text-slate-400 text-sm mt-1">
            {loading ? "Загрузка..." : plural(count, "кандидат", "кандидата", "кандидатов") + " в базе"}
          </p>
        </div>

        <div className="relative">
          <svg
            width="16" height="16" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или email..."
            className="bg-[#151923] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors w-72"
          />
        </div>
      </div>

      <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1.5fr_1.2fr_1.3fr_2fr_70px_100px] text-xs text-slate-500 uppercase tracking-wide px-5 py-3 border-b border-white/5">
          <span>Имя</span>
          <span>Email</span>
          <span>Телефон</span>
          <span>Должность</span>
          <span>Вакансия / Клиент</span>
          <span>Опыт</span>
          <span>Добавлен</span>
        </div>

        {loading && (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1.6fr_1.5fr_1.2fr_1.3fr_2fr_70px_100px] px-5 py-4 gap-4 animate-pulse items-center">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/5 shrink-0" />
                  <div className="h-3.5 w-28 bg-white/5 rounded" />
                </div>
                <div className="h-3.5 w-32 bg-white/5 rounded" />
                <div className="h-3.5 w-24 bg-white/5 rounded" />
                <div className="h-3.5 w-28 bg-white/5 rounded" />
                <div className="h-3.5 w-36 bg-white/5 rounded" />
                <div className="h-3.5 w-8 bg-white/5 rounded" />
                <div className="h-3.5 w-20 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && count === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#EF9F27]/10 flex items-center justify-center mb-4">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#EF9F27]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">
              {query ? "Ничего не найдено" : "Нет кандидатов"}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs">
              {query
                ? `По запросу «${query}» кандидаты не найдены`
                : "Добавьте первого кандидата через страницу вакансии"}
            </p>
          </div>
        )}

        {!loading && candidates.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/candidates/${c.id}`)}
              className="grid grid-cols-[1.6fr_1.5fr_1.2fr_1.3fr_2fr_70px_100px] px-5 py-4 border-b border-white/5 last:border-0 cursor-pointer transition-colors items-center hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3 pr-4 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#EF9F27]/20 flex items-center justify-center shrink-0">
                  <span className="text-xs text-[#EF9F27] font-medium">
                    {c.firstName[0]}{c.lastName[0]}
                  </span>
                </div>
                <span className="text-sm font-medium truncate text-white">
                  {c.lastName} {c.firstName}
                </span>
              </div>
              <span className="text-sm text-slate-400 truncate pr-4">{c.email || "—"}</span>
              <span className="text-sm text-slate-400 truncate pr-4">{c.phone || "—"}</span>
              <span className="text-sm text-slate-400 truncate pr-4">{c.currentPosition || "—"}</span>
              <div className="pr-4">
                <VacancyBadges applications={c.applications} />
              </div>
              <span className="text-sm text-slate-400">
                {c.experience != null ? plural(c.experience, "год", "года", "лет") : "—"}
              </span>
              <span className="text-sm text-slate-400">{formatDate(c.createdAt)}</span>
            </div>
        ))}
      </div>
    </div>
  );
}
