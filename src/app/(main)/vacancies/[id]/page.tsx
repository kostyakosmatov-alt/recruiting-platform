"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AddCandidateModal from "@/components/AddCandidateModal";

type Candidate = {
  id: string; firstName: string; lastName: string;
  email: string | null; phone: string | null; experience: number | null;
};
type Application = { id: string; stage: string; createdAt: string; candidate: Candidate };
type Recruiter = { id: string; name: string };
type Vacancy = {
  id: string; title: string; description: string | null;
  status: string; priority: string;
  salaryFrom: number | null; salaryTo: number | null;
  client: { id: string; name: string };
  recruiter: Recruiter | null;
  teamRecruiters: Recruiter[];
  applications: Application[];
};

const STAGES = [
  { key: "NEW", label: "Новый" }, { key: "SCREENING", label: "Скрининг" },
  { key: "INTERVIEW", label: "Интервью" }, { key: "OFFER", label: "Оффер" },
  { key: "HIRED", label: "Hired" }, { key: "REJECTED", label: "Отказ" },
];
const STAGE_COLOR: Record<string, string> = {
  NEW: "text-slate-300 bg-slate-500/15", SCREENING: "text-blue-300 bg-blue-500/15",
  INTERVIEW: "text-violet-300 bg-violet-500/15", OFFER: "text-[#EF9F27] bg-[#EF9F27]/15",
  HIRED: "text-emerald-300 bg-emerald-500/15", REJECTED: "text-red-300 bg-red-500/15",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN: "Открыта", ON_HOLD: "На паузе", CLOSED: "Закрыта", FILLED: "Укомплектована",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-[#EF9F27]/15 text-[#EF9F27]", ON_HOLD: "bg-amber-500/15 text-amber-400",
  CLOSED: "bg-slate-500/15 text-slate-400", FILLED: "bg-[#EF9F27]/15 text-[#EF9F27]",
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Низкий", MEDIUM: "Средний", HIGH: "Высокий", URGENT: "Срочный",
};
const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-slate-400", MEDIUM: "text-blue-400", HIGH: "text-amber-400", URGENT: "text-red-400",
};

function formatSalary(from: number | null, to: number | null) {
  if (!from && !to) return null;
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if (from && to) return `${fmt(from)} – ${fmt(to)} ₽`;
  if (from) return `от ${fmt(from)} ₽`;
  return `до ${fmt(to!)} ₽`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function StageSelect({ vacancyId, application, onStageChange }: {
  vacancyId: string; application: Application;
  onStageChange: (id: string, stage: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStage = e.target.value;
    setLoading(true);
    try {
      const res = await fetch(`/api/vacancies/${vacancyId}/applications/${application.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) onStageChange(application.id, newStage);
    } finally { setLoading(false); }
  }
  return (
    <div className="relative inline-flex items-stretch">
      <select
        value={application.stage} onChange={handleChange} disabled={loading}
        onClick={(e) => e.stopPropagation()}
        className={`appearance-none text-xs font-medium pl-3 pr-7 py-1.5 rounded-lg border border-white/10 bg-[#0f1117] cursor-pointer focus:outline-none focus:border-[#BA7517] transition-colors disabled:opacity-50 w-full ${STAGE_COLOR[application.stage] ?? "text-slate-300 bg-slate-500/15"}`}
      >
        {STAGES.map((s) => <option key={s.key} value={s.key} className="bg-[#151923] text-white">{s.label}</option>)}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        {loading
          ? <svg className="animate-spin text-slate-400" width="11" height="11" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
          : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        }
      </span>
    </div>
  );
}

function TeamSection({ vacancyId, recruiter, team, onUpdate }: {
  vacancyId: string;
  recruiter: Recruiter | null;
  team: Recruiter[];
  onUpdate: (patch: Partial<Pick<Vacancy, "recruiter" | "teamRecruiters">>) => void;
}) {
  const [allUsers, setAllUsers] = useState<Recruiter[]>([]);
  const [addId, setAddId] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  const isAdmin = allUsers.length > 1;

  async function patch(body: object, optimistic: () => void) {
    optimistic();
    await fetch(`/api/vacancies/${vacancyId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function changeOwner(id: string) {
    const user = allUsers.find((u) => u.id === id);
    if (!user) return;
    setSaving("owner");
    await patch({ recruiterId: id }, () => {
      onUpdate({
        recruiter: user,
        teamRecruiters: team.some((t) => t.id === id) ? team : [...team, user],
      });
    });
    setSaving(null);
  }

  async function addMember() {
    if (!addId) return;
    const user = allUsers.find((u) => u.id === addId);
    if (!user || team.some((t) => t.id === addId)) return;
    setSaving("add");
    await patch({ addUserId: addId }, () => {
      onUpdate({ teamRecruiters: [...team, user] });
    });
    setSaving(null);
    setAddId("");
  }

  async function removeMember(id: string) {
    setSaving(id);
    await patch({ removeUserId: id }, () => {
      onUpdate({ teamRecruiters: team.filter((t) => t.id !== id) });
    });
    setSaving(null);
  }

  const notInTeam = allUsers.filter((u) => !team.some((t) => t.id === u.id));

  return (
    <div className="bg-[#151923] border border-white/5 rounded-xl p-5">
      <h2 className="text-sm font-medium text-white mb-4">Команда рекрутеров</h2>

      {/* Owner */}
      <div className="mb-4">
        <div className="text-xs text-slate-500 mb-1.5">Ответственный</div>
        {isAdmin ? (
          <select
            value={recruiter?.id ?? ""}
            onChange={(e) => changeOwner(e.target.value)}
            disabled={saving === "owner"}
            className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none disabled:opacity-50"
          >
            <option value="" disabled>Не назначен</option>
            {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        ) : (
          <span className="text-sm text-white">{recruiter?.name ?? "—"}</span>
        )}
      </div>

      {/* Team list */}
      <div className="space-y-1.5 mb-4">
        {team.map((m) => (
          <div key={m.id} className="flex items-center justify-between bg-[#0f1117] rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#BA7517]/20 flex items-center justify-center text-xs text-[#EF9F27] font-medium shrink-0">
                {m.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <span className="text-sm text-white">{m.name}</span>
              {m.id === recruiter?.id && (
                <span className="text-xs text-[#EF9F27] bg-[#EF9F27]/10 px-1.5 py-0.5 rounded">отв.</span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => removeMember(m.id)}
                disabled={saving === m.id}
                className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {team.length === 0 && (
          <p className="text-xs text-slate-600 py-1">Нет участников</p>
        )}
      </div>

      {/* Add recruiter */}
      {isAdmin && notInTeam.length > 0 && (
        <div className="flex gap-2">
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="flex-1 bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
          >
            <option value="">Добавить рекрутера...</option>
            {notInTeam.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button
            onClick={addMember}
            disabled={!addId || saving === "add"}
            className="bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default function VacancyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState("NEW");
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vacancies/${id}`);
      if (!res.ok) { router.push("/vacancies"); return; }
      setVacancy(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  const handleStageChange = useCallback((applicationId: string, newStage: string) => {
    setVacancy((v) => v ? {
      ...v,
      applications: v.applications.map((a) => a.id === applicationId ? { ...a, stage: newStage } : a),
    } : v);
  }, []);

  if (loading) return <div className="p-8 flex items-center justify-center h-64"><span className="text-slate-500 text-sm">Загрузка...</span></div>;
  if (!vacancy) return null;

  const apps = vacancy.applications;
  const stageApps = apps.filter((a) => a.stage === activeStage);
  const salary = formatSalary(vacancy.salaryFrom, vacancy.salaryTo);

  return (
    <>
      <div className="p-8">
        <button onClick={() => router.push("/vacancies")} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Вакансии
        </button>

        <div className="flex gap-6 items-start mb-8">
          {/* Main info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-white">{vacancy.title}</h1>
              <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[vacancy.status]}`}>
                {STATUS_LABEL[vacancy.status]}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>{vacancy.client.name}</span>
              {salary && <span className="text-slate-300">{salary}</span>}
              <span className={`font-medium ${PRIORITY_COLOR[vacancy.priority]}`}>{PRIORITY_LABEL[vacancy.priority]} приоритет</span>
            </div>
            {vacancy.description && <p className="mt-3 text-sm text-slate-400 max-w-xl">{vacancy.description}</p>}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shrink-0"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Добавить кандидата
          </button>
        </div>

        <div className="grid grid-cols-[1fr_260px] gap-6 mb-8">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Всего кандидатов", value: apps.length },
              { label: "В воронке", value: apps.filter((a) => !["HIRED", "REJECTED"].includes(a.stage)).length },
              { label: "Hired", value: apps.filter((a) => a.stage === "HIRED").length },
            ].map((m) => (
              <div key={m.label} className="bg-[#151923] border border-white/5 rounded-xl p-5">
                <div className="text-3xl font-semibold text-white mb-1">{m.value}</div>
                <div className="text-sm text-slate-400">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Team */}
          <TeamSection
            vacancyId={id}
            recruiter={vacancy.recruiter}
            team={vacancy.teamRecruiters}
            onUpdate={(patch) => setVacancy((v) => v ? { ...v, ...patch } : v)}
          />
        </div>

        {/* Stage tabs + table */}
        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          <div className="flex border-b border-white/5 overflow-x-auto">
            {STAGES.map((s) => {
              const count = apps.filter((a) => a.stage === s.key).length;
              const active = activeStage === s.key;
              return (
                <button
                  key={s.key} onClick={() => setActiveStage(s.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${active ? "text-[#EF9F27] border-[#BA7517]" : "text-slate-400 hover:text-slate-200 border-transparent"}`}
                >
                  {s.label}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-[#EF9F27]/20 text-[#EF9F27]" : "bg-white/5 text-slate-500"}`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-[2fr_1.5fr_1fr_100px_160px] text-xs text-slate-500 uppercase tracking-wide px-5 py-3 border-b border-white/5">
            <span>Кандидат</span><span>Email / Телефон</span><span>Опыт</span><span>Добавлен</span><span className="text-center">Этап</span>
          </div>

          {stageApps.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm">Нет кандидатов на этапе «{STAGES.find((s) => s.key === activeStage)?.label}»</p>
            </div>
          ) : (
            stageApps.map((app) => (
              <div key={app.id} className="grid grid-cols-[2fr_1.5fr_1fr_100px_160px] px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-center">
                <div className="text-sm text-white font-medium cursor-pointer hover:text-[#EF9F27] transition-colors" onClick={() => router.push(`/candidates/${app.candidate.id}`)}>
                  {app.candidate.lastName} {app.candidate.firstName}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm text-slate-400">{app.candidate.email || "—"}</span>
                  {app.candidate.phone && <span className="text-xs text-slate-500">{app.candidate.phone}</span>}
                </div>
                <span className="text-sm text-slate-400">{app.candidate.experience != null ? `${app.candidate.experience} лет` : "—"}</span>
                <span className="text-sm text-slate-400">{formatDate(app.createdAt)}</span>
                <div className="flex justify-center">
                  <StageSelect vacancyId={id} application={app} onStageChange={handleStageChange} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <AddCandidateModal vacancyId={id} onClose={() => setShowModal(false)} onAdded={() => { setShowModal(false); load(); }} />
      )}
    </>
  );
}
