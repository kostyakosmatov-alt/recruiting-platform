"use client";

import { useEffect, useState } from "react";
import AddUserModal from "@/components/AddUserModal";
import RecruiterCardModal from "@/components/RecruiterCardModal";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  openVacancies: number;
  totalClients: number;
  hiredLast30Days: number;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Администратор",
  RECRUITER: "Рекрутер",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(user: User) {
    setTogglingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => u.id === user.id ? { ...u, isActive: !user.isActive } : u)
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Команда</h1>
            <p className="text-slate-400 text-sm mt-1">Управление пользователями платформы</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-[#BA7517] hover:bg-[#a36414] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить рекрутера
          </button>
        </div>

        <div className="bg-[#151923] border border-white/5 rounded-xl overflow-hidden">
          {/* Header */}
          {!loading && users.length > 0 && (
            <div className="flex items-center px-5 py-2.5 border-b border-white/5">
              <div className="flex-1 min-w-0 text-xs font-medium text-slate-500 uppercase tracking-wider">Имя</div>
              <div style={{width:208,flexShrink:0}} className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</div>
              <div style={{width:140,flexShrink:0}} className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Роль</div>
              <div style={{width:80,flexShrink:0}} className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Вакансий</div>
              <div style={{width:80,flexShrink:0}} className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Клиентов</div>
              <div style={{width:96,flexShrink:0}} className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Hired/мес</div>
              <div style={{width:140,flexShrink:0}} />
            </div>
          )}

          {loading && (
            <div className="py-16 text-center text-slate-500 text-sm">Загрузка...</div>
          )}

          {!loading && users.length === 0 && (
            <div className="py-16 text-center text-slate-500 text-sm">Нет пользователей</div>
          )}

          {!loading && users.map((user) => (
            <div
              key={user.id}
              className="flex items-center px-5 py-4 border-b border-white/5 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => setSelectedUser(user)}
                  className="text-sm text-white font-medium hover:text-[#EF9F27] transition-colors text-left"
                >
                  {user.name}
                </button>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </div>
              </div>
              <div style={{width:208,flexShrink:0}} className="text-sm text-slate-400 truncate">{user.email}</div>
              <div style={{width:140,flexShrink:0}} className="flex justify-center">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  user.role === "ADMIN"
                    ? "bg-[#EF9F27]/15 text-[#EF9F27]"
                    : "bg-slate-500/15 text-slate-300"
                }`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>
              <div style={{width:80,flexShrink:0}} className="text-sm text-slate-300 text-center">{user.openVacancies}</div>
              <div style={{width:80,flexShrink:0}} className="text-sm text-slate-300 text-center">{user.totalClients}</div>
              <div style={{width:96,flexShrink:0}} className="text-sm text-slate-300 text-center">{user.hiredLast30Days}</div>
              <div style={{width:140,flexShrink:0}} className="flex justify-end">
                {user.role !== "ADMIN" && (
                  <button
                    onClick={() => toggleActive(user)}
                    disabled={togglingId === user.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                      user.isActive
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    }`}
                  >
                    {togglingId === user.id ? "..." : user.isActive ? "Деактивировать" : "Активировать"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AddUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}

      {selectedUser && (
        <RecruiterCardModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
            setSelectedUser((prev) => prev ? { ...prev, ...updated } : null);
          }}
        />
      )}
    </>
  );
}
