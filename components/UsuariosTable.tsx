"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, AlertTriangle } from "lucide-react";
import {
  listUsuarios,
  setHabilitado,
  estaHabilitado,
  eliminarUsuario,
  necesitaNormalizacion,
  normalizarUsuario,
} from "@/lib/services/usuarios";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/Pagination";
import type { Usuario, UserRole } from "@/lib/types";

type Props = {
  rol: UserRole;
  /** Columnas extra a renderizar a partir del documento. */
  extraColumns?: { key: string; label: string; render: (u: Usuario) => React.ReactNode }[];
  /** Acciones extra del menú (ej: "Gratificar" en profesionales). */
  extraActions?: { label: string; onClick: (u: Usuario) => void }[];
  /** Cambiar este valor fuerza una recarga de la tabla (ej: tras normalizar en masa). */
  reloadToken?: number;
};

/** Menú desplegable de acciones por fila (posicionado fixed para no recortarse). */
function ActionsMenu({
  items,
}: {
  items: { label: string; onClick: () => void; destructive?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const cerrar = () => setOpen(false);
    window.addEventListener("click", cerrar);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      window.removeEventListener("click", cerrar);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          const r = btnRef.current!.getBoundingClientRect();
          setPos({ top: r.bottom + 4, left: r.right - 160 });
          setOpen((v) => !v);
        }}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
        title="Acciones"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && pos && (
        <div
          className="fixed z-50 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={
                "block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 " +
                (it.destructive ? "text-rose-600" : "text-slate-700")
              }
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function UsuariosTable({
  rol,
  extraColumns = [],
  extraActions = [],
  reloadToken = 0,
}: Props) {
  const [data, setData] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listUsuarios(rol)
      .then(setData)
      .finally(() => setLoading(false));
  }, [rol, reloadToken]);

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

  // Página visible (client-side). Se resetea al cambiar la búsqueda.
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  async function recargar() {
    const fresh = await listUsuarios(rol);
    setData(fresh);
  }

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
      await recargar();
    } finally {
      setUpdating(null);
    }
  }

  /**
   * Escribe esProfesional: true en una cuenta que es profesional de hecho
   * pero quedó sin el flag. No toca el rol (que es la vista activa).
   */
  async function normalizar(u: Usuario) {
    if (
      !confirm(
        `Normalizar a ${u.nombre || u.email}?\n\n` +
          `Se le va a escribir esProfesional: true para que vuelva a aparecer ` +
          `en las búsquedas y recupere su agenda.\n\n` +
          `El rol actual (${u.rol}) NO se modifica.`,
      )
    )
      return;
    setUpdating(u.id);
    try {
      await normalizarUsuario(u.id);
      await recargar();
    } catch (e) {
      alert(`No se pudo normalizar: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUpdating(null);
    }
  }

  async function eliminar(u: Usuario) {
    if (
      !confirm(
        `¿Eliminar a ${u.nombre || u.email}? Esta acción borra su cuenta de la plataforma y no se puede deshacer.`,
      )
    )
      return;
    setUpdating(u.id);
    try {
      await eliminarUsuario(u.id);
      await recargar();
    } finally {
      setUpdating(null);
    }
  }

  // La columna "Flag" solo tiene sentido en la vista de profesionales.
  const mostrarFlag = rol === "profesional";
  const totalCols = 5 + extraColumns.length + (mostrarFlag ? 1 : 0);
  const inconsistentes = filtered.filter(necesitaNormalizacion).length;

  return (
    <div className="p-6">
      {mostrarFlag && inconsistentes > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{inconsistentes}</strong>{" "}
          {inconsistentes === 1 ? "cuenta profesional está" : "cuentas profesionales están"} sin
          el flag <code className="rounded bg-amber-100 px-1">esProfesional</code>. No aparecen en
          las búsquedas de la app. Usá &quot;Normalizar&quot; en cada fila, o el botón de arriba
          para repararlas todas.
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
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
              {mostrarFlag && <th className="px-4 py-2">Flag</th>}
              <th className="px-4 py-2 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={totalCols} className="px-4 py-6 text-center text-slate-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="px-4 py-6 text-center text-slate-400">
                  Sin resultados
                </td>
              </tr>
            )}
            {pageItems.map((u) => {
              const ok = estaHabilitado(u);
              const roto = necesitaNormalizacion(u);
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
                  {mostrarFlag && (
                    <td className="px-4 py-2">
                      {roto ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                          title={`rol = ${u.rol}, sin esProfesional. No aparece en las búsquedas.`}
                        >
                          <AlertTriangle size={12} /> Sin flag
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">OK</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end">
                      <ActionsMenu
                        items={[
                          {
                            label: ok ? "Inhabilitar" : "Habilitar",
                            onClick: () => toggle(u),
                          },
                          ...(roto
                            ? [{ label: "Normalizar", onClick: () => normalizar(u) }]
                            : []),
                          ...extraActions.map((a) => ({
                            label: a.label,
                            onClick: () => a.onClick(u),
                          })),
                          {
                            label: "Eliminar",
                            onClick: () => eliminar(u),
                            destructive: true,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
