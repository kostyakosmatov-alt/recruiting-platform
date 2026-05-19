"use client";

import { useEffect, useRef, useState } from "react";

type User = { id: string; name: string; role: string };

type Client = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  recruiter?: { id: string; name: string } | null;
};

type Props = {
  client: Client;
  onClose: () => void;
  onSaved: (updated: Client) => void;
};

export default function EditClientModal({ client, onClose, onSaved }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: client.name,
    contactName: client.contactName ?? "",
    contactEmail: client.contactEmail ?? "",
    contactPhone: client.contactPhone ?? "",
    recruiterId: client.recruiter?.id ?? "",
  });

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
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
    if (!form.name.trim()) { setError("Укажите название компании"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка сервера"); return; }
      onSaved(data);
    } catch {
      setError("Ошибка сети");
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
      <div className="bg-[#151923] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-white font-semibold">Редактировать клиента</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {[
            { field: "name",         label: "Название компании", required: true,  type: "text",  placeholder: "ООО Ромашка" },
            { field: "contactName",  label: "Контактное лицо",   required: false, type: "text",  placeholder: "Иван Иванов" },
            { field: "contactEmail", label: "Email",             required: false, type: "email", placeholder: "ivan@company.ru" },
            { field: "contactPhone", label: "Телефон",           required: false, type: "tel",   placeholder: "+7 (999) 123-45-67" },
          ].map(({ field, label, required, type, placeholder }) => (
            <div key={field}>
              <label className="block text-xs text-slate-400 mb-1.5">
                {label} {required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={type}
                value={form[field as keyof typeof form]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>
          ))}

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

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2">
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
