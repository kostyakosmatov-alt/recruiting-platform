"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CreateVacancyModal from "@/components/CreateVacancyModal";

type Vacancy = {
  id: string;
  title: string;
  status: string;
  priority: string;
  salaryFrom: number | null;
  salaryTo: number | null;
  commissionType: string;
  commissionValue: number;
  client: { name: string };
  recruiter: { id: string; name: string } | null;
  _count?: { applications: number };
};

type DraftVacancy = {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  salaryFrom: number | null;
  salaryTo: number | null;
  remote: boolean;
  location: string | null;
  client: { id: string; name: string };
  recruiter: { id: string; name: string } | null;
  intakeSessions: { id: string; token: string; contactName: string | null; channel: string; createdAt: string }[];
};

type User = { id: string; name: string };

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

const fmtRub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

function formatCommission(type: string, value: number, salaryTo: number | null): string {
  if (!value) return "—";
  if (type === "FIXED") return fmtRub.format(value);
  if (!salaryTo) return `${value}%`;
  return fmtRub.format((value / 100) * salaryTo * 12);
}

function DraftCard({ draft, users, onPublished }: {
  draft: DraftVacancy;
  users: User[];
  onPublished: (id: string) => void;
}) {
  const [recruiterId, setRecruiterId] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const intake = draft.intakeSessions[0];

  async function publish() {
    if (!recruiterId) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/vacancies/${draft.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterId }),
      });
      if (res.ok) onPublished(draft.id);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="bg-[#151923] border border-[#EF9F27]/20 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 font-medium">Черновик</span>
              {intake && (
                <span className="text-xs text-slate-500">
                  {intake.channel === "TELEGRAM" ? "✈️" : "🌐"} {intake.contactName || "Заказчик"} · {new Date(intake.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <h3
              className="text-sm font-semibold text-white cursor-pointer hover:text-[#EF9F27] transition-colors"
              onClick={() => router.push(`/vacancies/${draft.id}`)}
            >
              {draft.title}
            </h3>
            <div className="text-xs text-slate-500 mt-0.5">{draft.client.name}{draft.location ? ` · ${draft.location}` : ""}{draft.remote ? " · Удалёнка" : ""}</div>
            {formatSalary(draft.salaryFrom, draft.salaryTo) !== "—" && (
              <div className="text-xs text-slate-400 mt-1">{formatSalary(draft.salaryFrom, draft.salaryTo)}</div>
            )}
          </div>

          {intake && (
            <a
              href={`/intake/${intake.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-slate-500 hover:text-[#EF9F27] transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Переписка
            </a>
          )}
        </div>

        {(draft.description || draft.requirements) && (
          <div className="mt-3">
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className={`transition-transform ${expanded ? "rotate-180" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {expanded ? "Скрыть детали" : "Показать детали"}
            </button>
            {expanded && (
              <div className="mt-3 space-y-3">
                {draft.description && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Описание</div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{draft.description}</p>
                  </div>
                )}
                {draft.requirements && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Требования</div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{draft.requirements}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
          <select
            value={recruiterId}
            onChange={(e) => setRecruiterId(e.target.value)}
            className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
          >
            <option value="">Назначить рекрутера...</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button
            onClick={publish}
            disabled={!recruiterId || publishing}
            className="flex items-center gap-2 bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            {publishing ? (
              <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {publishing ? "Публикуем..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VacanciesPage() {
  const router = useRouter();
  const { data: authSession } = useSession();
  const isAdmin = authSession?.user?.role === "ADMIN";

  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [drafts, setDrafts] = useState<DraftVacancy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [vData, dData, uData] = await Promise.all([
        fetch("/api/vacancies").then((r) => r.json()),
        isAdmin ? fetch("/api/vacancies/drafts").then((r) => r.json()) : Promise.resolve([]),
        isAdmin ? fetch("/api/users").then((r) => r.json()) : Promise.resolve([]),
      ]);
      setVacancies(Array.isArray(vData) ? vData : []);
      setDrafts(Array.isArray(dData) ? dData : []);
      setUsers(Array.isArray(uData) ? uData : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authSession !== undefined) load();
  }, [authSession]);

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

        {/* Drafts queue — admin only */}
        {isAdmin && !loading && drafts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-white">Черновики от заказчиков</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EF9F27]/20 text-[#EF9F27] font-medium">{drafts.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {drafts.map((d) => (
                <DraftCard
                  key={d.id}
                  draft={d}
                  users={users}
                  onPublished={(id) => {
                    setDrafts((prev) => prev.filter((x) => x.id !== id));
                    load();
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Main vacancy list */}
        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          {!loading && vacancies.length > 0 && (
            <div className="flex items-center px-5 py-2.5 border-b border-white/5">
              <div className="flex-1 min-w-0 text-xs font-medium text-slate-500 uppercase tracking-wider">Вакансия</div>
              <div className="flex items-center shrink-0">
                <div className="w-36 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Статус</div>
                <div className="w-24 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Приоритет</div>
                <div className="w-36 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Зарплата</div>
                <div className="w-36 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Комиссия</div>
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
                <div className="w-36 text-right text-xs font-medium text-[#EF9F27]">
                  {formatCommission(v.commissionType, v.commissionValue, v.salaryTo)}
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
