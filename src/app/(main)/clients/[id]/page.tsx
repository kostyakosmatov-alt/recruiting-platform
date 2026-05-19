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

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

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

          {/* Right: metrics + vacancies */}
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
