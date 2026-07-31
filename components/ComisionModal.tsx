"use client";

import { useState } from "react";
import { exencionVigente, comisionPersonalizada } from "@/lib/services/usuarios";
import type { Usuario } from "@/lib/types";

/** Modal de comisión: porcentaje personalizado + exención por premio. */
export function ComisionModal({
  usuario,
  global,
  busy,
  onGuardarPorcentaje,
  onExencion,
  onClose,
}: {
  usuario: Usuario;
  global: number;
  busy: boolean;
  onGuardarPorcentaje: (pct: number | null) => void;
  onExencion: (dias: number) => void;
  onClose: () => void;
}) {
  const vigente = exencionVigente(usuario);
  const actual = comisionPersonalizada(usuario);
  const [pct, setPct] = useState<string>(actual !== null ? String(actual) : "");
  const [dias, setDias] = useState(30);

  const pctNum = pct === "" ? null : Number(pct);
  const pctValido =
    pctNum === null || (Number.isFinite(pctNum) && pctNum >= 0 && pctNum <= 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          Tarifa de servicio — {usuario.nombre || usuario.email}
        </h2>

        <div className="mt-4">
          <label className="block text-xs text-slate-500">
            Porcentaje personalizado (global: {global}%)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              placeholder={`${global} (global)`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => pctValido && onGuardarPorcentaje(pctNum)}
              disabled={busy || !pctValido}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Vacío = usa el porcentaje global.
          </p>
        </div>

        <div className="my-4 h-px bg-slate-100" />

        <div>
          <label className="block text-xs text-slate-500">
            Premio de competencia: días sin tarifa de servicio
          </label>
          {vigente && (
            <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Exención vigente hasta {vigente}. Aplicar de nuevo la reemplaza
              (contando desde hoy).
            </p>
          )}
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
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              min={1}
              value={dias}
              onChange={(e) => setDias(Math.max(0, Number(e.target.value)))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={() => onExencion(dias)}
              disabled={busy || dias <= 0}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
          {vigente && (
            <button
              onClick={() => onExencion(0)}
              disabled={busy}
              className="mt-2 text-xs text-rose-600 hover:underline disabled:opacity-50"
            >
              Quitar exención vigente
            </button>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
