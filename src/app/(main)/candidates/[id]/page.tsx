"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EditCandidateModal from "@/components/EditCandidateModal";
import CandidateFiles from "@/components/CandidateFiles";

type Note = { id: string; content: string; createdAt: string; author: { name: string } };
type Application = {
  id: string;
  stage: string;
  createdAt: string;
  vacancy: { id: string; title: string; client: { name: string } };
};
type CandidateFile = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentPosition: string | null;
  experience: number | null;
  createdAt: string;
  applications: Application[];
  notes: Note[];
  files: CandidateFile[];
};

const STAGE_LABEL: Record<string, string> = {
  NEW: "Новый", SCREENING: "Скрининг", INTERVIEW: "Интервью",
  TEST_TASK: "Тестовое", OFFER: "Оффер", HIRED: "Hired", REJECTED: "Отказ",
};
const STAGE_COLOR: Record<string, string> = {
  NEW: "bg-slate-500/15 text-slate-400",
  SCREENING: "bg-blue-500/15 text-blue-400",
  INTERVIEW: "bg-violet-500/15 text-violet-400",
  TEST_TASK: "bg-amber-500/15 text-amber-400",
  OFFER: "bg-[#EF9F27]/15 text-[#EF9F27]",
  HIRED: "bg-[#EF9F27]/15 text-[#EF9F27]",
  REJECTED: "bg-red-500/15 text-red-400",
};

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 19) return `${n} ${many}`;
  if (m10 === 1) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

function formatDate(iso: string, withTime = false) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm text-white">{value || "—"}</div>
    </div>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) { router.push("/candidates"); return; }
      setCandidate(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/candidates/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteText }),
      });
      if (!res.ok) return;
      const note = await res.json();
      setCandidate((c) => c ? { ...c, notes: [note, ...c.notes] } : c);
      setNoteText("");
      textareaRef.current?.focus();
    } finally {
      setSubmittingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <span className="text-slate-500 text-sm">Загрузка...</span>
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <>
      <div className="p-8">
        {/* Back */}
        <button
          onClick={() => router.push("/candidates")}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Кандидаты
        </button>

        <div className="grid grid-cols-[320px_1fr] gap-6 items-start">
          {/* ── Left: main info ── */}
          <div className="bg-[#151923] border border-white/5 rounded-xl p-6 space-y-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#EF9F27]/20 flex items-center justify-center shrink-0">
                <span className="text-lg text-[#EF9F27] font-semibold">
                  {candidate.firstName[0]}{candidate.lastName[0]}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white leading-tight">
                  {candidate.lastName} {candidate.firstName}
                </h1>
                {candidate.currentPosition && (
                  <p className="text-sm text-slate-400 mt-0.5">{candidate.currentPosition}</p>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <InfoRow label="Email" value={candidate.email} />
              <InfoRow label="Телефон" value={candidate.phone} />
              <InfoRow label="Текущая должность" value={candidate.currentPosition} />
              <InfoRow
                label="Опыт работы"
                value={candidate.experience != null ? plural(candidate.experience, "год", "года", "лет") : null}
              />
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

          {/* ── Right: activity ── */}
          <div className="space-y-5">
            {/* Vacancies */}
            <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-medium text-white">Участие в вакансиях</h2>
              </div>
              {candidate.applications.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Не добавлен ни в одну вакансию</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {candidate.applications.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => router.push(`/vacancies/${app.vacancy.id}`)}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white font-medium">{app.vacancy.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{app.vacancy.client.name}</div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ml-4 ${STAGE_COLOR[app.stage] ?? "bg-slate-500/15 text-slate-400"}`}>
                        {STAGE_LABEL[app.stage] ?? app.stage}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h2 className="text-sm font-medium text-white">Заметки</h2>
              </div>

              {/* Add note form */}
              <form onSubmit={submitNote} className="px-5 py-4 border-b border-white/5">
                <textarea
                  ref={textareaRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitNote(e);
                  }}
                  placeholder="Добавить заметку... (⌘Enter для отправки)"
                  rows={3}
                  className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={submittingNote || !noteText.trim()}
                    className="bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {submittingNote ? "Добавление..." : "Добавить заметку"}
                  </button>
                </div>
              </form>

              {/* Notes list */}
              {candidate.notes.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Заметок пока нет</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {candidate.notes.map((note) => (
                    <div key={note.id} className="px-5 py-4">
                      <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">{note.author.name}</span>
                        <span className="text-slate-700">·</span>
                        <span className="text-xs text-slate-500">{formatDate(note.createdAt, true)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files */}
            <CandidateFiles
              candidateId={candidate.id}
              initialFiles={candidate.files}
            />

            {/* Meta */}
            <div className="text-xs text-slate-600 px-1">
              Добавлен {formatDate(candidate.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditCandidateModal
          candidate={candidate}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setCandidate((c) => c ? { ...c, ...updated } : c);
            setShowEdit(false);
          }}
        />
      )}
    </>
  );
}
