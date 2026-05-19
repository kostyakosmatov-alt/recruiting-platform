"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  vacancyTitle: string;
  salaryFrom: number | null;
  salaryTo: number | null;
  location: string | null;
  remote: boolean;
  description: string | null;
  requirements: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterTelegram: string | null;
  onClose: () => void;
};

type Platform = "hh" | "avito" | "telegram";

const PLATFORMS: { key: Platform; label: string; color: string; bg: string; border: string }[] = [
  { key: "hh",       label: "HH.ru",    color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" },
  { key: "avito",    label: "Авито",    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  { key: "telegram", label: "Telegram", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
];

function fmtSalary(from: number | null, to: number | null) {
  const f = (n: number) => n.toLocaleString("ru-RU");
  if (from && to) return `${f(from)} – ${f(to)} ₽`;
  if (from) return `от ${f(from)} ₽`;
  if (to) return `до ${f(to)} ₽`;
  return "по договорённости";
}

function generateTemplate(platform: Platform, props: Props): string {
  const { vacancyTitle, salaryFrom, salaryTo, location, remote, description, requirements, recruiterName, recruiterEmail, recruiterTelegram } = props;
  const salary = fmtSalary(salaryFrom, salaryTo);
  const place = remote ? "Удалённо" : location ?? "Офис";
  const tgContact = recruiterTelegram ? `@${recruiterTelegram}` : null;

  if (platform === "hh") {
    return [
      vacancyTitle,
      "",
      `Заработная плата: ${salary}`,
      `Формат работы: ${place}`,
      "",
      description ? `О позиции:\n${description}` : "",
      requirements ? `\nТребования:\n${requirements}` : "",
      "",
      "Условия:",
      "• Официальное трудоустройство",
      "• Конкурентная заработная плата",
      "• Профессиональный рост",
      "",
      recruiterName ? `Контактное лицо: ${recruiterName}` : "",
      tgContact ? `Telegram: ${tgContact}` : (recruiterEmail ? `Email: ${recruiterEmail}` : ""),
    ].filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (platform === "avito") {
    return [
      vacancyTitle,
      "",
      `💵 Зарплата: ${salary}`,
      `📍 ${place}`,
      "",
      description ? description.slice(0, 300) + (description.length > 300 ? "..." : "") : "",
      requirements ? `\nЧто нужно:\n${requirements}` : "",
      "",
      tgContact ? `Пишите: ${tgContact}` : (recruiterName ? `Пишите: ${recruiterName}` : ""),
    ].filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  // telegram
  return [
    `🔥 ${vacancyTitle}`,
    "",
    `💰 ${salary}`,
    `📍 ${place}`,
    "",
    description ? `📋 ${description}` : "",
    requirements ? `\n✅ Что нужно:\n${requirements}` : "",
    "",
    "🤝 Что предлагаем:",
    "• Интересные задачи",
    "• Дружная команда",
    "• Рост и развитие",
    "",
    tgContact ? `📩 По всем вопросам: ${tgContact}` : (recruiterName ? `📩 По всем вопросам: ${recruiterName}` : ""),
  ].filter(Boolean).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function PublishVacancyModal({ onClose, ...props }: Props & { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<Platform>>(new Set(["hh"]));
  const [activeTab, setActiveTab] = useState<Platform>("hh");
  const [texts, setTexts] = useState<Record<Platform, string>>(() => ({
    hh: generateTemplate("hh", props),
    avito: generateTemplate("avito", props),
    telegram: generateTemplate("telegram", props),
  }));
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function togglePlatform(key: Platform) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        if (activeTab === key) {
          const remaining = PLATFORMS.map((p) => p.key).filter((k) => next.has(k));
          if (remaining.length) setActiveTab(remaining[0]);
        }
      } else {
        next.add(key);
        setActiveTab(key);
      }
      return next;
    });
  }

  function copyText() {
    navigator.clipboard.writeText(texts[activeTab]).then(() => {
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    });
  }

  const activePlatforms = PLATFORMS.filter((p) => selected.has(p.key));

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-[#151923] border border-white/10 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-white font-semibold">Публикация вакансии</h2>
            <p className="text-slate-400 text-sm mt-0.5">{props.vacancyTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors mt-0.5">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Platform cards */}
          <div className="grid grid-cols-3 gap-3">
            {PLATFORMS.map((p) => {
              const on = selected.has(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                    on ? `${p.bg} ${p.border}` : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center ${on ? p.border.replace("/30", "") + " " + p.bg : "border-slate-600"}`}>
                    {on && <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor" className={p.color}><path d="M1.5 5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span className={`text-sm font-medium ${on ? p.color : "text-slate-400"}`}>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tabs + textarea */}
          {activePlatforms.length > 0 ? (
            <div className="bg-[#0f1117] rounded-xl border border-white/5 overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                {activePlatforms.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setActiveTab(p.key)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === p.key
                        ? `${p.color} border-current`
                        : "text-slate-500 border-transparent hover:text-slate-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                value={texts[activeTab]}
                onChange={(e) => setTexts((prev) => ({ ...prev, [activeTab]: e.target.value }))}
                rows={14}
                className="w-full bg-transparent px-4 py-3 text-sm text-slate-300 resize-none focus:outline-none font-mono leading-relaxed"
              />
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-sm">Выберите хотя бы одну площадку</div>
          )}
        </div>

        {/* Footer */}
        {activePlatforms.length > 0 && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              {/* Toast */}
              {toast && (
                <span className="text-xs text-emerald-400 font-medium">Скопировано!</span>
              )}
              <button
                onClick={copyText}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Скопировать текст
              </button>
              <button
                onClick={onClose}
                className="bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Готово
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
