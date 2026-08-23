"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import {
  crearGratificacion,
  listGratificaciones,
  setEstadoGratificacion,
} from "@/lib/services/gratificaciones";
import type { Gratificacion, Usuario } from "@/lib/types";

const fmtARS = (n: number) => "$" + n.toLocaleString("es-AR");

function fechaCorta(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Modal para gratificar a un profesional: muestra su alias/CBU (cargado por
 * él en la app), registra el premio como "pendiente de transferir" y permite
 * marcarlo como "transferida" una vez hecha la transferencia manual en MP.
 */
export function GratificarModal({
  usuario,
  onClose,
}: {
  usuario: Usuario;
  onClose: () => void;
}) {
  const facturacion = (usuario.perfil as { facturacion?: { tipo: string; valor: string } } | undefined)
    ?.facturacion;

  const [monto, setMonto] = useState("");
  const [motivo, setMotivo] = useState("");
  const [items, setItems] = useState<Gratificacion[]>([]);
  const [busy, setBusy] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function cargar() {
    listGratificaciones(usuario.id).then(setItems);
  }
  useEffect(cargar, [usuario.id]);

  async function copiar() {
    if (!facturacion?.valor) return;
    await navigator.clipboard.writeText(facturacion.valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  async function registrar() {
    const n = Number(monto);
    if (!Number.isFinite(n) || n <= 0) {
      setMsg("Ingresá un monto mayor a 0.");
      return;
    }
    if (!motivo.trim()) {
      setMsg("Ingresá un motivo (ej: ganador de la competencia).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await crearGratificacion({
        profesionalId: usuario.id,
        profesionalNombre: usuario.nombre || usuario.email || "—",
        monto: n,
        motivo: motivo.trim(),
      });
      setMonto("");
      setMotivo("");
      cargar();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEstado(g: Gratificacion) {
    setBusy(true);
    try {
      await setEstadoGratificacion(
        g.id,
        g.estado === "pendiente" ? "transferida" : "pendiente",
      );
      cargar();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Gift size={18} className="text-brand-600" />
          <h2 className="text-lg font-semibold">
            Gratificar — {usuario.nombre || usuario.email}
          </h2>
        </div>

        {/* Destino de la transferencia */}
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="text-xs uppercase text-slate-500">
            Destino de la transferencia
          </div>
          {facturacion?.valor ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {facturacion.tipo === "alias" ? "Alias" : "CBU/CVU"}:
              </span>
              <code className="rounded bg-white px-2 py-0.5 text-sm ring-1 ring-slate-200">
                {facturacion.valor}
              </code>
              <button
                onClick={copiar}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                title="Copiar"
              >
                {copiado ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-amber-700">
              El profesional todavía no cargó su alias/CBU en la app (Perfil →
              Información de facturación). Pedíselo para poder transferirle.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            La transferencia se hace manualmente desde tu cuenta de Mercado
            Pago o banco. Acá queda el registro.
          </p>
        </div>

        {/* Alta de gratificación */}
        <div className="mt-4 grid grid-cols-[110px_1fr_auto] gap-2">
          <input
            type="number"
            min={1}
            placeholder="Monto $"
            value={monto}
            onChange={(e) => {
              setMonto(e.target.value);
              setMsg(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Motivo (ej: ganador competencia julio)"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setMsg(null);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={registrar}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Registrar
          </button>
        </div>
        {msg && <p className="mt-1 text-sm text-red-600">{msg}</p>}

        {/* Historial */}
        <div className="mt-4">
          <div className="text-xs uppercase text-slate-500">Historial</div>
          <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-sm text-slate-400">Sin gratificaciones registradas.</p>
            )}
            {items.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ring-1 ring-slate-100"
              >
                <span className="w-20 shrink-0 tabular-nums font-medium">
                  {fmtARS(g.monto)}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-600" title={g.motivo}>
                  {g.motivo}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {fechaCorta(g.estado === "transferida" ? g.transferidaEn : g.creadoEn)}
                </span>
                <button
                  onClick={() => toggleEstado(g)}
                  disabled={busy}
                  title={
                    g.estado === "pendiente"
                      ? "Marcar como transferida"
                      : "Volver a pendiente"
                  }
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-xs disabled:opacity-50 " +
                    (g.estado === "transferida"
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100")
                  }
                >
                  {g.estado === "transferida" ? "Transferida ✓" : "Pendiente"}
                </button>
              </div>
            ))}
          </div>
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
