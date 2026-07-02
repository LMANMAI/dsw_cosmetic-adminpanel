"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listUsuarios,
  setHabilitado,
  estaHabilitado,
  setExencionComision,
  exencionVigente,
} from "@/lib/services/usuarios";
import type { Usuario, UserRole } from "@/lib/types";

type Props = {
  rol: UserRole;
  /** Columnas extra a renderizar a partir del documento. */
  extraColumns?: { key: string; label: string; render: (u: Usuario) => React.ReactNode }[];
};

/** Modal para eximir de comisión a un profesional (premio de competencia). */
function PremiarModal({
  usuario,
  busy,
  onConfirm,
  onClose,
}: {
  usuario: Usuario;
  busy: boolean;
  onConfirm: (dias: number) => void;
  onClose: () => void;
}) {
  const vigente = exencionVigente(usuario);
  const [dias, setDias] = useState(30);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Premiar profesional</h2>
        <p className="mt-1 text-sm text-slate-500">
          {usuario.nombre || usuario.email} quedará exento de la comisión de la
          plataforma durante los días indicados.
        </p>
        {vigente && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Ya tiene una exención vigente hasta {vigente}. Confirmar la
            reemplaza (contando desde hoy).
          </p>
        )}

        <label className="mt-4 block text-xs text-slate-500">
          Días sin comisión
        </label>
        <input
          type="number"
          min={0}
          value={dias}
          onChange={(e) => setDias(Math.max(0, Number(e.target.value)))}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          autoFocus
        />
        <div className="mt-2 flex gap-1.5">
          {[7, 15, 30, 60].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDias(d)}
              className={
                "rounded-full border px-2.5 py-0.5 text-xs " +
                (dias === d
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50")
              }
            >
              {d} días
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          {vigente && (
            <button
              onClick={() => onConfirm(0)}
              disabled={busy}
              className="mr-auto rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Quitar exención
            </button>
          )}
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(dias)}
            disabled={busy || dias <= 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  async function confirmarPremio(u: Usuario, dias: number) {
    setUpdating(u.id);
    try {
      await setExencionComision(u.id, dias);
      setData(await listUsuarios(rol));
      setPremiando(null);
    } finally {
      setUpdating(null);
    }
  }

  const [premiando, setPremiando] = useState<Usuario | null>(null);

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
                    <div className="flex justify-end gap-1.5">
                      {rol === "profesional" && (
                        <button
                          disabled={updating === u.id}
                          onClick={() => setPremiando(u)}
                          title="Eximir de comisión por X días (premio de competencia)"
                          className={
                            "rounded-lg border px-3 py-1 text-xs disabled:opacity-50 " +
                            (exencionVigente(u)
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-slate-200 hover:bg-slate-100")
                          }
                        >
                          {exencionVigente(u) ? "Premiado ★" : "Premiar"}
                        </button>
                      )}
                      <button
                        disabled={updating === u.id}
                        onClick={() => toggle(u)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                      >
                        {ok ? "Inhabilitar" : "Habilitar"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {premiando && (
        <PremiarModal
          usuario={premiando}
          busy={updating === premiando.id}
          onConfirm={(dias) => confirmarPremio(premiando, dias)}
          onClose={() => setPremiando(null)}
        />
      )}
    </div>
  );
}
