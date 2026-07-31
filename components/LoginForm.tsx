"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const { loginGoogle, loginEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de login");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      await loginGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-1 text-xl font-semibold">YOFI Admin</h1>
        <p className="mb-4 text-sm text-slate-500">
          Solo emails autorizados pueden entrar.
        </p>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Ingresar con Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />o<div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="contraseña"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
