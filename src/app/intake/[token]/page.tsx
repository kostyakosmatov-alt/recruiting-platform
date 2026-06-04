"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };
type IntakeFile = { name: string; url: string; type: string };

type Session = {
  id: string;
  status: string;
  messages: Message[];
  files: IntakeFile[];
  clientName: string;
  vacancyId: string | null;
};

function renderText(text: string) {
  // Convert **bold** and line breaks
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ color: "#EF9F27" }}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p.replace(/\n/g, "\n")}</span>;
  });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "12px",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #BA7517, #EF9F27)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      )}
      <div
        style={{
          maxWidth: "70%",
          padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? "linear-gradient(135deg, #BA7517, #EF9F27)" : "#1e2433",
          color: "white",
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {renderText(msg.content)}
      </div>
    </div>
  );
}

export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/intake/${token}`);
      if (!res.ok) { setLoading(false); return; }
      const data: Session = await res.json();
      setSession(data);
      if (data.status === "COMPLETED") { setConfirmed(true); setDone(true); }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  async function sendMessage() {
    if (!input.trim() || sending || done) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    setSession((s) => s ? {
      ...s,
      messages: [...s.messages, { role: "user", content: text }],
    } : s);

    try {
      const res = await fetch(`/api/intake/${token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      setSession((s) => s ? {
        ...s,
        messages: [...s.messages, { role: "assistant", content: data.message }],
      } : s);
      if (data.done) setDone(true);
    } catch {
      setSession((s) => s ? {
        ...s,
        messages: [...s.messages, { role: "assistant", content: "Произошла ошибка. Попробуйте ещё раз." }],
      } : s);
    } finally {
      setSending(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/intake/${token}/upload`, { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        setSession((s) => s ? {
          ...s,
          files: [...s.files, data.file],
          messages: [...s.messages, { role: "assistant", content: `📎 Файл **${data.file.name}** успешно загружен и прочитан. Я ознакомился с его содержимым и учту при составлении брифа.` }],
        } : s);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/intake/${token}/confirm`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setConfirmed(true);
        setSession((s) => s ? { ...s, status: "COMPLETED", vacancyId: data.vacancyId } : s);
      }
    } finally {
      setConfirming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0e14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Загрузка...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0e14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "white", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Сессия не найдена</div>
          <div style={{ color: "#64748b", fontSize: 14 }}>Ссылка недействительна или устарела</div>
        </div>
      </div>
    );
  }

  const messages = session.messages || [];
  const lastMsg = messages[messages.length - 1];
  const vacancyPreview = done && lastMsg?.role === "assistant" ? lastMsg.content.replace("INTERVIEW_COMPLETE", "").trim() : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0b0e14", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0f1117",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #BA7517, #EF9F27)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div>
          <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>CTB Agency — HR-консультант</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>Брифинг вакансии · {session.clientName}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: confirmed ? "#64748b" : "#22c55e" }} />
          <span style={{ color: "#64748b", fontSize: 12 }}>
            {confirmed ? "Завершено" : "В процессе"}
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(186,117,23,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#EF9F27" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div style={{ color: "white", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Добро пожаловать!</div>
              <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
                Я помогу составить бриф вакансии.<br />
                Напишите название должности, которую нужно закрыть, и мы начнём.
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {sending && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #BA7517, #EF9F27)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginRight: 10, flexShrink: 0,
              }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div style={{
                padding: "12px 16px",
                borderRadius: "18px 18px 18px 4px",
                background: "#1e2433",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#EF9F27",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Vacancy preview + confirm button */}
          {done && !confirmed && vacancyPreview && (
            <div style={{
              marginTop: 16,
              padding: "20px",
              borderRadius: 12,
              background: "rgba(186,117,23,0.08)",
              border: "1px solid rgba(239,159,39,0.2)",
            }}>
              <div style={{ color: "#EF9F27", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Превью вакансии
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {vacancyPreview}
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                style={{
                  marginTop: 16,
                  width: "100%",
                  padding: "12px",
                  borderRadius: 8,
                  background: confirming ? "#4a3010" : "linear-gradient(135deg, #BA7517, #EF9F27)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                  border: "none",
                  cursor: confirming ? "not-allowed" : "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                {confirming ? "Создаём вакансию..." : "Подтвердить и создать вакансию"}
              </button>
            </div>
          )}

          {confirmed && (
            <div style={{
              marginTop: 16,
              padding: "20px",
              borderRadius: 12,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
              textAlign: "center",
            }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={1.5} style={{ margin: "0 auto 12px", display: "block" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div style={{ color: "white", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Вакансия создана!</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                Бриф успешно обработан. Рекрутер уже получил задачу.
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      {!confirmed && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "#0f1117",
          padding: "16px 24px",
          position: "sticky",
          bottom: 0,
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {/* Uploaded files */}
            {session.files.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                {session.files.map((f, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 20,
                    background: "rgba(186,117,23,0.1)",
                    border: "1px solid rgba(239,159,39,0.2)",
                    fontSize: 12,
                    color: "#EF9F27",
                  }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {f.name}
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              background: "#151923",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "10px 10px 10px 14px",
            }}>
              {/* File upload button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading || done}
                title="Прикрепить файл (PDF, DOCX, TXT)"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: uploading ? "#EF9F27" : "#64748b",
                  cursor: uploading || done ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "border-color 0.2s, color 0.2s",
                }}
              >
                {uploading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ animation: "spin 1s linear infinite" }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={handleUpload} style={{ display: "none" }} />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={done ? "Интервью завершено" : "Напишите сообщение... (Enter — отправить, Shift+Enter — новая строка)"}
                disabled={done || sending}
                rows={1}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  color: "white",
                  fontSize: 14,
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.6,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
              />

              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending || done}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: input.trim() && !sending && !done ? "linear-gradient(135deg, #BA7517, #EF9F27)" : "rgba(255,255,255,0.05)",
                  border: "none",
                  color: input.trim() && !sending && !done ? "white" : "#475569",
                  cursor: input.trim() && !sending && !done ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <div style={{ color: "#334155", fontSize: 11, textAlign: "center", marginTop: 8 }}>
              CTB Agency · Конфиденциальный брифинг
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        textarea::placeholder { color: #475569; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
