"use client";

import { useEffect, useRef, useState } from "react";

type Vacancy = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  salaryFrom: number | null;
  salaryTo: number | null;
  commissionType: string;
  commissionValue: number;
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Открыта" },
  { value: "ON_HOLD", label: "На паузе" },
  { value: "CLOSED", label: "Закрыта" },
  { value: "FILLED", label: "Укомплектована" },
];
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
  { value: "URGENT", label: "Срочный" },
];

const fmtRub = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });

export default function EditVacancyModal({
  vacancy,
  onClose,
  onSaved,
}: {
  vacancy: Vacancy;
  onClose: () => void;
  onSaved: (updated: Vacancy) => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: vacancy.title,
    description: vacancy.description ?? "",
    status: vacancy.status,
    priority: vacancy.priority,
    salaryFrom: vacancy.salaryFrom?.toString() ?? "",
    salaryTo: vacancy.salaryTo?.toString() ?? "",
    commissionType: vacancy.commissionType,
    commissionValue: vacancy.commissionValue?.toString() ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!form.title.trim()) { setError("Укажите название"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/vacancies/${vacancy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          priority: form.priority,
          salaryFrom: form.salaryFrom ? Number(form.salaryFrom) : null,
          salaryTo: form.salaryTo ? Number(form.salaryTo) : null,
          commissionType: form.commissionType,
          commissionValue: form.commissionValue ? Number(form.commissionValue) : 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Ошибка сохранения");
        return;
      }
      const updated = await res.json();
      onSaved(updated);
    } finally {
      setLoading(false);
    }
  }

  const commissionPreview =
    form.commissionType === "PERCENTAGE" && form.commissionValue && form.salaryTo
      ? fmtRub.format((Number(form.commissionValue) / 100) * Number(form.salaryTo) * 12)
      : null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#151923] border border-white/10 rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 sticky top-0 bg-[#151923] z-10">
          <h2 className="text-white font-semibold">Редактировать вакансию</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Название <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors resize-none"
            />
          </div>

          {/* Status + Priority */}
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

          {/* Salary */}
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

          {/* Commission */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Комиссия</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10 mb-2">
              {(["FIXED", "PERCENTAGE"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("commissionType", type)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    form.commissionType === type
                      ? "bg-[#BA7517] text-white"
                      : "bg-[#0f1117] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {type === "FIXED" ? "Фиксированная (₽)" : "% от годового оклада"}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={form.commissionValue}
              onChange={(e) => set("commissionValue", e.target.value)}
              placeholder={form.commissionType === "FIXED" ? "Сумма в рублях" : "Процент, например 10"}
              min={0}
              className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
            />
            {commissionPreview && (
              <p className="text-xs text-slate-500 mt-1.5">
                Расчёт: {commissionPreview} (без НДС)
              </p>
            )}
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
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
