"use client";

import { useEffect, useRef, useState } from "react";

type Client = { id: string; name: string };
type User = { id: string; name: string; role: string };

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Открыта" },
  { value: "ON_HOLD", label: "На паузе" },
  { value: "CLOSED", label: "Закрыта" },
  { value: "FILLED", label: "Закрыта (укомплектована)" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
  { value: "URGENT", label: "Срочный" },
];

export default function CreateVacancyModal({ onClose, onCreated }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    clientId: "",
    recruiterId: "",
    salaryFrom: "",
    salaryTo: "",
    status: "OPEN",
    priority: "MEDIUM",
  });

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients).catch(() => {});
    fetch("/api/users").then((r) => r.json()).then((data: User[]) => {
      setUsers(data);
      if (data.length === 1) setForm((f) => ({ ...f, recruiterId: data[0].id }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Укажите название вакансии"); return; }
    if (!form.clientId) { setError("Выберите клиента"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/vacancies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Ошибка сервера");
        return;
      }
      onCreated();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  const showRecruiterSelect = users.length > 1;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#151923] border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-white font-semibold">Новая вакансия</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Название <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Например: Senior Frontend Developer"
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Клиент <span className="text-red-400">*</span></label>
            <select
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
            >
              <option value="" disabled className="text-slate-500">Выберите клиента</option>
              {clients.length === 0 && <option disabled className="text-slate-500">Нет доступных клиентов</option>}
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {showRecruiterSelect && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Ответственный рекрутер</label>
              <select
                value={form.recruiterId}
                onChange={(e) => set("recruiterId", e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
              >
                <option value="" className="text-slate-500">Не назначен</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Описание позиции, требования..."
              rows={3}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Зарплата от (₽)</label>
              <input
                type="number"
                value={form.salaryFrom}
                onChange={(e) => set("salaryFrom", e.target.value)}
                placeholder="100 000"
                min={0}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Зарплата до (₽)</label>
              <input
                type="number"
                value={form.salaryTo}
                onChange={(e) => set("salaryTo", e.target.value)}
                placeholder="200 000"
                min={0}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Статус</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
              >
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Приоритет</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#BA7517] transition-colors appearance-none"
              >
                {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2">
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Создание..." : "Создать вакансию"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
