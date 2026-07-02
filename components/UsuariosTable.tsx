"use client";

import { useEffect, useMemo, useState } from "react";
import { listUsuarios, setHabilitado, estaHabilitado } from "@/lib/services/usuarios";
import type { Usuario, UserRole } from "@/lib/types";

type Props = {
  rol: UserRole;
  /** Columnas extra a renderizar a partir del documento. */
  extraColumns?: { key: string; label: string; render: (u: Usuario) => React.ReactNode }[];
};

export function UsuariosTable({ rol, extraColumns = [] }: Props) {
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listUsuarios(rol)
      .then(setData)
      .finally(() => setLoading(false));
  }, [rol]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return data;
    return data.filter(
      (u) =>
        u.nombre?.toLowerCase().includes(t) ||
        u.email?.toLowerCase().includes(t) ||
        u.telefono?.toLowerCase().includes(t),
    );
  }, [data, q]);

  async function toggle(u: Usuario) {
    const habilitadoActual = estaHabilitado(u);
    if (
      !confirm(
        habilitadoActual
          ? `Inhabilitar a ${u.nombre || u.email}?`
          : `Habilitar a ${u.nombre || u.email}?`,
      )
    )
      return;
    setUpdating(u.id);
    try {
      await setHabilitado(u.id, rol, !habilitadoActual);
      const fresh = await listUsuarios(rol);
      setData(fresh);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono…"
          className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <span className="text-sm text-slate-500">{filtered.length} resultados</span>
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Teléfono</th>
              {extraColumns.map((c) => (
                <th key={c.key} className="px-4 py-2">{c.label}</th>
              ))}
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5 + extraColumns.length} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5 + extraColumns.length} className="px-4 py-6 text-center text-slate-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {filtered.map((u) => {
              const ok = estaHabilitado(u);
              return (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{u.nombre || "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 text-slate-600">{u.telefono || "—"}</td>
                  {extraColumns.map((c) => (
                    <td key={c.key} className="px-4 py-2 text-slate-600">
                      {c.render(u)}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <span
                      className={
                        "inline-flex rounded-full px-2 py-0.5 text-xs " +
                        (ok
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700")
                      }
                    >
                      {ok ? "Habilitado" : "Inhabilitado"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      disabled={updating === u.id}
                      onClick={() => toggle(u)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                    >
                      {ok ? "Inhabilitar" : "Habilitar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
