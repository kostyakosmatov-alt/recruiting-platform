"use client";

import { useEffect, useState } from "react";

type RecruiterDetail = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  telegramUsername: string | null;
  openVacancies: number;
  totalClients: number;
  hiredLast30Days: number;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Администратор",
  RECRUITER: "Рекрутер",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function RecruiterCardModal({
  user,
  onClose,
  onUpdated,
}: {
  user: RecruiterDetail;
  onClose: () => void;
  onUpdated: (updated: RecruiterDetail) => void;
}) {
  const [name, setName] = useState(user.name);
  const [telegram, setTelegram] = useState(user.telegramUsername ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, string> = { name, telegramUsername: telegram };
      if (password) body.password = password;

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        try {
          const d = await res.json();
          setError(d.error ?? `Ошибка ${res.status}`);
        } catch {
          setError(`Ошибка сервера ${res.status}`);
        }
        return;
      }
      const updated = await res.json();
      setPassword("");
      onUpdated({ ...user, ...updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setToggling(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Ошибка");
        return;
      }
      const updated = await res.json();
      onUpdated({ ...user, ...updated });
    } finally {
      setToggling(false);
    }
  }

  const isDirty = name !== user.name || telegram !== (user.telegramUsername ?? "") || password.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#EF9F27]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[#EF9F27] text-lg font-semibold">{initials(user.name)}</span>
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">{user.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
                user.role === "ADMIN"
                  ? "bg-[#EF9F27]/15 text-[#EF9F27]"
                  : "bg-slate-500/15 text-slate-300"
              }`}>
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors mt-1">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-px mx-6 mt-5 bg-white/5 rounded-xl overflow-hidden">
          <div className="bg-[#151923] px-4 py-3 text-center">
            <div className="text-lg font-semibold text-white">{user.openVacancies}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Вакансий</div>
          </div>
          <div className="bg-[#151923] px-4 py-3 text-center">
            <div className="text-lg font-semibold text-white">{user.totalClients}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Клиентов</div>
          </div>
          <div className="bg-[#151923] px-4 py-3 text-center">
            <div className="text-lg font-semibold text-white">{user.hiredLast30Days}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Нанято / мес</div>
          </div>
        </div>

        {/* Fields */}
        <div className="px-6 mt-5 space-y-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">ФИО</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#151923] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EF9F27]/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Telegram</label>
            <div className="relative">
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} className="text-slate-500 text-sm">@</span>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value.replace(/^@/, ""))}
                placeholder="username"
                style={{ paddingLeft: 28 }}
                className="w-full bg-[#151923] border border-white/10 rounded-lg pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EF9F27]/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Логин (email)</label>
            <div className="w-full bg-[#151923] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-slate-400 select-all cursor-text">
              {user.email}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Новый пароль</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Оставьте пустым, чтобы не менять"
                className="w-full bg-[#151923] border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#EF9F27]/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 mt-4">
          {user.role !== "ADMIN" ? (
            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                user.isActive
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
              }`}
            >
              {toggling ? "..." : user.isActive ? "Деактивировать" : "Активировать"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={save}
              disabled={saving || !isDirty}
              className="text-sm px-4 py-2 rounded-lg bg-[#BA7517] hover:bg-[#a36414] text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
