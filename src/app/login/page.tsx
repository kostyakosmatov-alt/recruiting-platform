"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-[#BA7517] hover:bg-[#a36414] disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
    >
      {pending ? "Вход..." : "Войти"}
    </button>
  );
}

export default function LoginPage() {
  const [error, formAction] = useActionState(loginAction, null);

  return (
    <div className="flex-1 min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#BA7517]/20 mb-4">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-[#EF9F27]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">CTB Agency</h1>
          <p className="text-slate-400 text-sm mt-1">Войдите в систему</p>
        </div>

        <div className="bg-[#151923] border border-white/10 rounded-2xl p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                placeholder="admin@ctb.agency"
                required
                autoComplete="email"
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Пароль</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full bg-[#0f1117] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#BA7517] transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
