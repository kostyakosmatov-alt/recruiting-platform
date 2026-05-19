"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreateVacancyModal from "@/components/CreateVacancyModal";

type Vacancy = {
  id: string;
  title: string;
  status: string;
  priority: string;
  salaryFrom: number | null;
  salaryTo: number | null;
  client: { name: string };
  recruiter: { id: string; name: string } | null;
  _count?: { applications: number };
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Открыта", ON_HOLD: "На паузе", CLOSED: "Закрыта", FILLED: "Укомплектована",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-[#EF9F27]/15 text-[#EF9F27]",
  ON_HOLD: "bg-amber-500/15 text-amber-400",
  CLOSED: "bg-slate-500/15 text-slate-400",
  FILLED: "bg-[#EF9F27]/15 text-[#EF9F27]",
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный",
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-slate-400", MEDIUM: "text-blue-400", HIGH: "text-amber-400", URGENT: "text-red-400",
};

function formatSalary(from: number | null, to: number | null) {
  if (!from && !to) return "—";
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (from && to) return `${fmt(from)} – ${fmt(to)} ₽`;
  if (from) return `от ${fmt(from)} ₽`;
  return `до ${fmt(to!)} ₽`;
}

export default function VacanciesPage() {
  const router = useRouter();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetch("/api/vacancies").then((r) => r.json());
      setVacancies(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Вакансии</h1>
            <p className="text-slate-400 text-sm mt-1">Управление открытыми позициями</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Создать вакансию
          </button>
        </div>

        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          {/* Column headers */}
          {!loading && vacancies.length > 0 && (
            <div className="flex items-center px-5 py-2.5 border-b border-white/5">
              <div className="flex-1 min-w-0 text-xs font-medium text-slate-500 uppercase tracking-wider">Вакансия</div>
              <div className="flex items-center shrink-0">
                <div className="w-36 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</div>
                <div className="w-24 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Приоритет</div>
                <div className="w-36 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Зарплата</div>
              </div>
            </div>
          )}

          {loading && <div className="py-16 text-center text-slate-500 text-sm">Загрузка...</div>}

          {!loading && vacancies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EF9F27]/10 flex items-center justify-center mb-4">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#EF9F27]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">Нет вакансий</h3>
              <p className="text-slate-400 text-sm max-w-xs">Создайте первую вакансию, чтобы начать подбор кандидатов</p>
            </div>
          )}

          {!loading && vacancies.map((v) => (
            <div
              key={v.id}
              onClick={() => router.push(`/vacancies/${v.id}`)}
              className="flex items-center px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              {/* Title + meta */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{v.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 truncate">{v.client.name}</span>
                  {v.recruiter && (
                    <>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500 truncate">{v.recruiter.name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Columns aligned with headers */}
              <div className="flex items-center shrink-0">
                <div className="w-36 flex justify-center">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[v.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                    {STATUS_LABEL[v.status] ?? v.status}
                  </span>
                </div>
                <div className={`w-24 text-center text-xs font-medium ${PRIORITY_COLOR[v.priority] ?? "text-slate-400"}`}>
                  {PRIORITY_LABEL[v.priority] ?? v.priority}
                </div>
                <div className="w-36 text-right text-xs text-slate-400">
                  {formatSalary(v.salaryFrom, v.salaryTo)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <CreateVacancyModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); load(); }} />
      )}
    </>
  );
}
