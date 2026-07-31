"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  normalizarTodos,
  type ResultadoNormalizacion,
} from "@/lib/services/usuarios";

type Fase = "analizando" | "previsualizacion" | "aplicando" | "listo" | "error";

/**
 * Barrido masivo de cuentas profesionales sin el flag `esProfesional`.
 *
 * Siempre corre primero en modo dry-run: muestra exactamente qué cuentas se
 * van a tocar y por qué, y recién escribe cuando el admin confirma.
 */
export function NormalizarModal({ onClose }: { onClose: (huboCambios: boolean) => void }) {
  const [fase, setFase] = useState<Fase>("analizando");
  const [preview, setPreview] = useState<ResultadoNormalizacion | null>(null);
  const [resultado, setResultado] = useState<ResultadoNormalizacion | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    normalizarTodos(true)
      .then((r) => {
        setPreview(r);
        setFase("previsualizacion");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setFase("error");
      });
  }, []);

  async function aplicar() {
    setFase("aplicando");
    try {
      const r = await normalizarTodos(false);
      setResultado(r);
      setFase("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFase("error");
    }
  }

  const cerrar = () => onClose(fase === "listo" && (resultado?.reparados.length ?? 0) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">Normalizar cuentas profesionales</h2>
          <button
            onClick={cerrar}
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm">
          {fase === "analizando" && (
            <p className="flex items-center gap-2 text-slate-600">
              <Loader2 size={16} className="animate-spin" />
              Revisando la colección de usuarios…
            </p>
          )}

          {fase === "error" && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
              <p className="font-medium">No se pudo completar</p>
              <p className="mt-1 text-xs">{error}</p>
              <p className="mt-2 text-xs">
                Si dice <code>permission-denied</code>, tu usuario admin no tiene permiso de
                escritura sobre <code>usuarios</code>. Revisá que exista en la colección con{" "}
                <code>rol: &quot;admin&quot;</code>.
              </p>
            </div>
          )}

          {fase === "previsualizacion" && preview && (
            <>
              <p className="text-slate-600">
                Se revisaron <strong>{preview.revisados}</strong> cuentas.
              </p>
              {preview.reparados.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                  <CheckCircle2 size={16} />
                  Está todo consistente. No hay nada que normalizar.
                </p>
              ) : (
                <>
                  <p className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                    <AlertTriangle size={16} />
                    <span>
                      <strong>{preview.reparados.length}</strong>{" "}
                      {preview.reparados.length === 1 ? "cuenta" : "cuentas"} se van a marcar con{" "}
                      <code className="rounded bg-amber-100 px-1">esProfesional: true</code>. El
                      rol de cada una queda como está.
                    </span>
                  </p>
                  <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {preview.reparados.map((r) => (
                      <li key={r.id} className="px-3 py-2">
                        <p className="font-medium text-slate-800">{r.nombre || "—"}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{r.motivo}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}

          {fase === "aplicando" && (
            <p className="flex items-center gap-2 text-slate-600">
              <Loader2 size={16} className="animate-spin" />
              Escribiendo cambios…
            </p>
          )}

          {fase === "listo" && resultado && (
            <>
              <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                <CheckCircle2 size={16} />
                {resultado.reparados.length} de {resultado.revisados} cuentas normalizadas.
              </p>
              {resultado.errores.length > 0 && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
                  <p className="font-medium">{resultado.errores.length} fallaron:</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {resultado.errores.map((e) => (
                      <li key={e.id}>
                        <code>{e.id}</code> — {e.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={cerrar}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {fase === "listo" ? "Cerrar" : "Cancelar"}
          </button>
          {fase === "previsualizacion" && (preview?.reparados.length ?? 0) > 0 && (
            <button
              onClick={aplicar}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Aplicar a {preview!.reparados.length}{" "}
              {preview!.reparados.length === 1 ? "cuenta" : "cuentas"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
