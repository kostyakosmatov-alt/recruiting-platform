"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CreateClientModal from "@/components/CreateClientModal";

type Client = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  _count: { vacancies: number };
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активен",
  INACTIVE: "Неактивен",
  PROSPECT: "Потенциальный",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-[#EF9F27]/15 text-[#EF9F27]",
  INACTIVE: "bg-slate-500/15 text-slate-400",
  PROSPECT: "bg-amber-500/15 text-amber-400",
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleCreated() {
    setShowModal(false);
    load();
  }

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Клиенты</h1>
            <p className="text-slate-400 text-sm mt-1">Компании-заказчики подбора</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить клиента
          </button>
        </div>

        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_80px] text-xs text-slate-500 uppercase tracking-wide px-5 py-3 border-b border-white/5">
            <span>Компания</span>
            <span>Контакт</span>
            <span>Email / Телефон</span>
            <span>Статус</span>
            <span>Вакансии</span>
          </div>

          {loading && (
            <div className="py-16 text-center text-slate-500 text-sm">Загрузка...</div>
          )}

          {!loading && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EF9F27]/10 flex items-center justify-center mb-4">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#EF9F27]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">Нет клиентов</h3>
              <p className="text-slate-400 text-sm max-w-xs">Добавьте первого клиента, чтобы создавать вакансии</p>
            </div>
          )}

          {!loading && clients.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/clients/${c.id}`)}
              className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr_80px] px-5 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
            >
              <span className="text-white text-sm font-medium truncate pr-4">{c.name}</span>
              <span className="text-slate-400 text-sm truncate pr-4">{c.contactName || "—"}</span>
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="text-slate-400 text-sm truncate">{c.contactEmail || "—"}</span>
                {c.contactPhone && (
                  <span className="text-slate-500 text-xs">{c.contactPhone}</span>
                )}
              </div>
              <span>
                <span className={`inline-flex text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[c.status] ?? "bg-slate-500/15 text-slate-400"}`}>
                  {STATUS_LABEL[c.status] ?? c.status}
                </span>
              </span>
              <span className="text-slate-400 text-sm">{c._count.vacancies}</span>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <CreateClientModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
