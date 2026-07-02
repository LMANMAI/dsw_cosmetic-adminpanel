"use client";

import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "./LoginForm";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }

  if (!user) return <LoginForm />;

  if (!isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Sin acceso</h1>
        <p className="max-w-md text-slate-600">
          Tu cuenta <strong>{user.email}</strong> no está autorizada para el panel
          administrativo. Pedí que te agreguen a la lista de admins.
        </p>
        <button
          onClick={logout}
          className="rounded-lg border px-4 py-2 hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
