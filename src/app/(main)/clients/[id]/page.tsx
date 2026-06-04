"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EditClientModal from "@/components/EditClientModal";

type VacancyRow = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  _count: { applications: number };
  applications: { id: string }[];
};

type Recruiter = { id: string; name: string };

type IntakeSessionRow = {
  id: string;
  token: string;
  status: string;
  channel: string;
  contactName: string | null;
  createdAt: string;
  vacancyId: string | null;
};

type Client = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  createdAt: string;
  recruiter: Recruiter | null;
  vacancies: VacancyRow[];
  intakeSessions: IntakeSessionRow[];
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Открыта", ON_HOLD: "На паузе", CLOSED: "Закрыта", FILLED: "Укомплектована",
};
const STATUS_COLOR: Record<string, string> = {
  OPEN:    "bg-[#EF9F27]/15 text-[#EF9F27]",
  ON_HOLD: "bg-amber-500/15   text-amber-400",
  CLOSED:  "bg-slate-500/15   text-slate-400",
  FILLED:  "bg-[#EF9F27]/15  text-[#EF9F27]",
};
const CLIENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активен", INACTIVE: "Неактивен", PROSPECT: "Потенциальный",
};
const CLIENT_STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "bg-[#EF9F27]/15 text-[#EF9F27]",
  INACTIVE: "bg-slate-500/15   text-slate-400",
  PROSPECT: "bg-amber-500/15   text-amber-400",
};

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-white">{value || "—"}</div>
    </div>
  );
}

function RecruiterSelect({
  clientId,
  current,
  onChange,
}: {
  clientId: string;
  current: Recruiter | null;
  onChange: (r: Recruiter | null) => void;
}) {
  const [users, setUsers] = useState<Recruiter[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, []);

  if (users.length <= 1) {
    return <span className="text-sm text-white">{current?.name ?? "—"}</span>;
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const user = users.find((u) => u.id === id) ?? null;
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterId: id || null }),
      });
      if (res.ok) onChange(user);
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={current?.id ?? ""}
      onChange={handleChange}
      disabled={saving}
      className="bg-[#0f1117] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none disabled:opacity-50 w-full"
    >
      <option value="">Не назначен</option>
      {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select>
  );
}

const INTAKE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидает",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершён",
};
const INTAKE_STATUS_COLOR: Record<string, string> = {
  PENDING:     "bg-slate-500/15 text-slate-400",
  IN_PROGRESS: "bg-amber-500/15 text-amber-400",
  COMPLETED:   "bg-[#EF9F27]/15 text-[#EF9F27]",
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const TG_BOT = process.env.NEXT_PUBLIC_TG_BOT_USERNAME || "CTB_intake_bot";

function intakeLinks(token: string) {
  return {
    web: `${APP_URL}/intake/${token}`,
    tg: `https://t.me/${TG_BOT}?start=${token}`,
  };
}

function CopyLinks({ token }: { token: string }) {
  const [copiedWeb, setCopiedWeb] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);
  const { web, tg } = intakeLinks(token);
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-6">🌐</span>
        <code className="flex-1 text-xs text-[#EF9F27] bg-black/30 rounded px-2 py-1.5 truncate">{web}</code>
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(web); setCopiedWeb(true); setTimeout(() => setCopiedWeb(false), 2000); }}
          className="text-xs px-2.5 py-1.5 rounded bg-[#EF9F27]/15 text-[#EF9F27] hover:bg-[#EF9F27]/25 transition-colors whitespace-nowrap"
        >
          {copiedWeb ? "✓" : "Копировать"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 w-6">✈️</span>
        <code className="flex-1 text-xs text-blue-400 bg-black/30 rounded px-2 py-1.5 truncate">{tg}</code>
        <button
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(tg); setCopiedTg(true); setTimeout(() => setCopiedTg(false), 2000); }}
          className="text-xs px-2.5 py-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
        >
          {copiedTg ? "✓" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [creatingIntake, setCreatingIntake] = useState(false);
  const [intakeToken, setIntakeToken] = useState<string | null>(null);
  const [copiedWeb, setCopiedWeb] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [deletingToken, setDeletingToken] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) { router.push("/clients"); return; }
      setClient(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function toggleSession(token: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  async function deleteSession(token: string) {
    if (!confirm("Удалить этот брифинг?")) return;
    setDeletingToken(token);
    try {
      const res = await fetch(`/api/intake/${token}`, { method: "DELETE" });
      if (res.ok) {
        setClient((c) => c ? { ...c, intakeSessions: c.intakeSessions.filter((s) => s.token !== token) } : c);
        if (intakeToken === token) setIntakeToken(null);
      }
    } finally {
      setDeletingToken(null);
    }
  }

  async function createIntake() {
    setCreatingIntake(true);
    try {
      const res = await fetch("/api/intake/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntakeToken(data.token);
        setClient((c) => c ? {
          ...c,
          intakeSessions: [{ id: data.token, token: data.token, status: "PENDING", channel: "WEB", contactName: null, createdAt: new Date().toISOString(), vacancyId: null }, ...c.intakeSessions],
        } : c);
      }
    } finally {
      setCreatingIntake(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <span className="text-slate-500 text-sm">Загрузка...</span>
      </div>
    );
  }

  if (!client) return null;

  const totalVacancies  = client.vacancies.length;
  const activeVacancies = client.vacancies.filter((v) => v.status === "OPEN").length;
  const totalCandidates = client.vacancies.reduce((s, v) => s + v._count.applications, 0);
  const totalHired      = client.vacancies.reduce((s, v) => s + v.applications.length, 0);

  return (
    <>
      <div className="p-8">
        <button
          onClick={() => router.push("/clients")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Клиенты
        </button>

        <div className="grid grid-cols-[300px_1fr] gap-6 items-start">
          {/* Left: info */}
          <div className="bg-[#151923] border border-white/5 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EF9F27]/20 flex items-center justify-center shrink-0">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#EF9F27]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white leading-tight">{client.name}</h1>
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${CLIENT_STATUS_COLOR[client.status] ?? ""}`}>
                  {CLIENT_STATUS_LABEL[client.status] ?? client.status}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <InfoRow label="Контактное лицо" value={client.contactName} />
              <InfoRow label="Email"           value={client.contactEmail} />
              <InfoRow label="Телефон"         value={client.contactPhone} />
              <div>
                <div className="text-xs text-slate-500 mb-1">Ответственный рекрутер</div>
                <RecruiterSelect
                  clientId={id}
                  current={client.recruiter}
                  onChange={(r) => setClient((c) => c ? { ...c, recruiter: r } : c)}
                />
              </div>
            </div>

            <button
              onClick={() => setShowEdit(true)}
              className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white text-sm py-2.5 rounded-lg transition-colors"
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Редактировать
            </button>
          </div>

          {/* Right: metrics + vacancies + briefings */}
          <div className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Всего вакансий",  value: totalVacancies },
                { label: "Активных",        value: activeVacancies },
                { label: "Кандидатов",      value: totalCandidates },
                { label: "Hired",           value: totalHired },
              ].map((m) => (
                <div key={m.label} className="bg-[#151923] border border-white/5 rounded-xl p-4">
                  <div className="text-2xl font-semibold text-white mb-1">{m.value}</div>
                  <div className="text-xs text-slate-400">{m.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-medium text-white">Вакансии</h2>
              </div>

              <div className="grid grid-cols-[2fr_1fr_80px_60px] text-xs text-slate-500 uppercase tracking-wide px-5 py-3 border-b border-white/5">
                <span>Название</span>
                <span>Статус</span>
                <span>Кандидатов</span>
                <span>Hired</span>
              </div>

              {client.vacancies.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-500 text-sm">Нет вакансий</p>
                </div>
              ) : (
                client.vacancies.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => router.push(`/vacancies/${v.id}`)}
                    className="grid grid-cols-[2fr_1fr_80px_60px] px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/[0.02] cursor-pointer transition-colors items-center"
                  >
                    <span className="text-sm text-white font-medium truncate pr-4">{v.title}</span>
                    <span>
                      <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[v.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                        {STATUS_LABEL[v.status] ?? v.status}
                      </span>
                    </span>
                    <span className="text-sm text-slate-400">{v._count.applications}</span>
                    <span className="text-sm text-slate-400">{v.applications.length}</span>
                  </div>
                ))
              )}
            </div>

            {/* Briefings section */}
            <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-medium text-white">Брифинги</h2>
                <button
                  onClick={createIntake}
                  disabled={creatingIntake}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#EF9F27]/10 text-[#EF9F27] hover:bg-[#EF9F27]/20 transition-colors disabled:opacity-50"
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  {creatingIntake ? "Создаётся..." : "Новый брифинг"}
                </button>
              </div>

              {intakeToken && (() => {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
                const webUrl = `${appUrl}/intake/${intakeToken}`;
                const tgUrl = `https://t.me/${process.env.NEXT_PUBLIC_TG_BOT_USERNAME || "CTB_intake_bot"}?start=${intakeToken}`;
                return (
                  <div className="px-5 py-4 border-b border-white/5 bg-[#EF9F27]/5 space-y-3">
                    <div className="text-xs text-slate-400">Брифинг создан — выберите способ отправки заказчику:</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-6">🌐</span>
                        <code className="flex-1 text-xs text-[#EF9F27] bg-black/30 rounded px-2 py-1.5 truncate">{webUrl}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(webUrl); setCopiedWeb(true); setTimeout(() => setCopiedWeb(false), 2000); }}
                          className="text-xs px-2.5 py-1.5 rounded bg-[#EF9F27]/15 text-[#EF9F27] hover:bg-[#EF9F27]/25 transition-colors whitespace-nowrap"
                        >
                          {copiedWeb ? "✓" : "Копировать"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-6">✈️</span>
                        <code className="flex-1 text-xs text-blue-400 bg-black/30 rounded px-2 py-1.5 truncate">{tgUrl}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(tgUrl); setCopiedTg(true); setTimeout(() => setCopiedTg(false), 2000); }}
                          className="text-xs px-2.5 py-1.5 rounded bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                        >
                          {copiedTg ? "✓" : "Копировать"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {(client.intakeSessions || []).length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-500 text-sm">Нет брифингов</p>
                </div>
              ) : (
                (client.intakeSessions || []).map((s) => {
                  const expanded = expandedSessions.has(s.token);
                  const isDeleting = deletingToken === s.token;
                  return (
                    <div key={s.id} className="border-b border-white/5 last:border-0">
                      <div
                        onClick={() => toggleSession(s.token)}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm" title={s.channel === "TELEGRAM" ? "Telegram" : "Веб"}>
                            {s.channel === "TELEGRAM" ? "✈️" : "🌐"}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${INTAKE_STATUS_COLOR[s.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                            {INTAKE_STATUS_LABEL[s.status] ?? s.status}
                          </span>
                          {s.contactName && (
                            <span className="text-xs text-slate-400">{s.contactName}</span>
                          )}
                          <span className="text-xs text-slate-500">
                            {new Date(s.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          {s.vacancyId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); router.push(`/vacancies/${s.vacancyId}`); }}
                              className="text-xs text-[#EF9F27] hover:underline"
                            >
                              → Вакансия
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(s.token); }}
                            disabled={isDeleting}
                            className="text-xs text-slate-600 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="Удалить брифинг"
                          >
                            {isDeleting ? "..." : (
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                          <svg
                            width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            className={`text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      {expanded && (
                        <div className="px-5 pb-4 bg-black/10">
                          <CopyLinks token={s.token} />
                          {s.channel !== "TELEGRAM" && (
                            <a
                              href={`/intake/${s.token}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Открыть чат
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditClientModal
          client={client}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setClient((c) => c ? { ...c, ...updated } : c);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}
