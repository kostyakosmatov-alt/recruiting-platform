"use client";

import { useEffect, useRef, useState } from "react";

type Candidate = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };

type Props = {
  vacancyId: string;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddCandidateModal({ vacancyId, onClose, onAdded }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"existing" | "new">("existing");

  // existing candidate tab
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [searching, setSearching] = useState(false);

  // new candidate tab
  const [newForm, setNewForm] = useState({ firstName: "", lastName: "", email: "", phone: "", experience: "", currentPosition: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/candidates?q=${encodeURIComponent(query)}`);
        setCandidates(await res.json());
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function addExisting() {
    if (!selected) { setError("Выберите кандидата"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/vacancies/${vacancyId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      onAdded();
    } catch { setError("Ошибка сети"); }
    finally { setLoading(false); }
  }

  async function createAndAdd() {
    if (!newForm.firstName.trim() || !newForm.lastName.trim()) {
      setError("Укажите имя и фамилию");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const cRes = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const candidate = await cRes.json();
      if (!cRes.ok) { setError(candidate.error || "Ошибка создания"); return; }

      const aRes = await fetch(`/api/vacancies/${vacancyId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.id }),
      });
      const aData = await aRes.json();
      if (!aRes.ok) { setError(aData.error || "Ошибка добавления"); return; }
      onAdded();
    } catch { setError("Ошибка сети"); }
    finally { setLoading(false); }
  }

  function setNew(field: string, value: string) {
    setNewForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#151923] border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <h2 className="text-white font-semibold">Добавить кандидата</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {(["existing", "new"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-[#EF9F27] border-b-2 border-[#BA7517]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "existing" ? "Выбрать из базы" : "Создать нового"}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {tab === "existing" ? (
            <>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
                placeholder="Поиск по имени или email..."
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />

              <div className="max-h-56 overflow-y-auto space-y-1">
                {searching && <p className="text-slate-500 text-sm text-center py-4">Поиск...</p>}
                {!searching && candidates.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-4">Кандидаты не найдены</p>
                )}
                {!searching && candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      selected?.id === c.id
                        ? "bg-[#EF9F27]/20 border border-[#BA7517]/40"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div className="text-sm text-white">{c.lastName} {c.firstName}</div>
                    {c.email && <div className="text-xs text-slate-400">{c.email}</div>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Имя <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newForm.firstName}
                    onChange={(e) => setNew("firstName", e.target.value)}
                    placeholder="Иван"
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Фамилия <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newForm.lastName}
                    onChange={(e) => setNew("lastName", e.target.value)}
                    placeholder="Иванов"
                    className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={newForm.email}
                  onChange={(e) => setNew("email", e.target.value)}
                  placeholder="ivan@mail.ru"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Телефон</label>
                <input
                  type="tel"
                  value={newForm.phone}
                  onChange={(e) => setNew("phone", e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Текущая должность</label>
                <input
                  type="text"
                  value={newForm.currentPosition}
                  onChange={(e) => setNew("currentPosition", e.target.value)}
                  placeholder="Senior Frontend Developer"
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Опыт работы (лет)</label>
                <input
                  type="number"
                  value={newForm.experience}
                  onChange={(e) => setNew("experience", e.target.value)}
                  placeholder="5"
                  min={0}
                  max={50}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
                />
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2"
            >
              Отмена
            </button>
            <button
              onClick={tab === "existing" ? addExisting : createAndAdd}
              disabled={loading}
              className="bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? "Добавление..." : "Добавить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
