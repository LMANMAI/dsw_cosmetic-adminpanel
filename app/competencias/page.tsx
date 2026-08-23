"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  calcularRanking,
  crearCompetencia,
  eliminarCompetencia,
  finalizarCompetencia,
  listCompetencias,
  type RankingItem,
} from "@/lib/services/competencias";
import type { Competencia } from "@/lib/types";

function hoyISO(dias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function FormNueva({ onCreada }: { onCreada: () => void }) {
  const [nombre, setNombre] = useState("");
  const [meta, setMeta] = useState(10);
  const [gratificacion, setGratificacion] = useState("");
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(hoyISO(30));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !gratificacion.trim()) {
      setError("Completá nombre y gratificación.");
      return;
    }
    if (fin < inicio) {
      setError("La fecha de fin debe ser posterior al inicio.");
      return;
    }
    setGuardando(true);
    try {
      await crearCompetencia({
        nombre: nombre.trim(),
        metaServicios: meta,
        gratificacion: gratificacion.trim(),
        fechaInicio: inicio,
        fechaFin: fin,
      });
      setNombre("");
      setGratificacion("");
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";

  return (
    <form
      onSubmit={submit}
      className="rounded-xl bg-white p-5 ring-1 ring-slate-200"
    >
      <div className="mb-3 text-sm font-semibold">Nueva competencia</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Nombre</label>
          <input
            className={input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Desafío Julio"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Meta (servicios completados)
          </label>
          <input
            type="number"
            min={1}
            className={input}
            value={meta}
            onChange={(e) => setMeta(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Inicio</label>
          <input
            type="date"
            className={input}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Fin</label>
          <input
            type="date"
            className={input}
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs text-slate-500">
            Gratificación
          </label>
          <input
            className={input}
            value={gratificacion}
            onChange={(e) => setGratificacion(e.target.value)}
            placeholder='Ej: "$50.000" o "1 mes sin tarifa de servicio"'
          />
        </div>
        <div className="flex items-end lg:col-span-2">
          <button
            type="submit"
            disabled={guardando}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Plus size={16} />
            {guardando ? "Creando…" : "Crear competencia"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function Ranking({ comp }: { comp: Competencia }) {
  const [items, setItems] = useState<RankingItem[] | null>(null);

  useEffect(() => {
    calcularRanking(comp).then(setItems);
  }, [comp]);

  if (!items) return <p className="text-sm text-slate-400">Cargando ranking…</p>;
  if (!items.length)
    return (
      <p className="text-sm text-slate-400">
        Sin servicios completados en el período todavía.
      </p>
    );

  return (
    <div className="space-y-2">
      {items.map((r, i) => {
        const pct = Math.min(100, (r.completados / comp.metaServicios) * 100);
        return (
          <div key={r.profesionalId} className="flex items-center gap-3 text-sm">
            <span className="w-6 text-right text-slate-400">{i + 1}.</span>
            <span className="w-40 truncate" title={r.nombre}>
              {r.nombre}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={
                  "h-full rounded-full " +
                  (r.cumplioMeta ? "bg-emerald-500" : "bg-brand-500")
                }
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 text-right tabular-nums">
              {r.completados}/{comp.metaServicios}
            </span>
            {r.cumplioMeta && (
              <Trophy size={14} className="shrink-0 text-amber-500" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompetenciaCard({
  comp,
  onCambio,
}: {
  comp: Competencia;
  onCambio: () => void;
}) {
  const [trabajando, setTrabajando] = useState(false);
  const activa = comp.estado === "activa";

  async function finalizar() {
    if (!confirm("¿Finalizar la competencia y registrar los ganadores?")) return;
    setTrabajando(true);
    await finalizarCompetencia(comp);
    setTrabajando(false);
    onCambio();
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta competencia? No se puede deshacer.")) return;
    setTrabajando(true);
    await eliminarCompetencia(comp.id);
    setTrabajando(false);
    onCambio();
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{comp.nombre}</span>
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs " +
                (activa
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-500")
              }
            >
              {activa ? "Activa" : "Finalizada"}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {comp.fechaInicio} → {comp.fechaFin} · Meta: {comp.metaServicios}{" "}
            servicios · Premio: {comp.gratificacion}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {activa && (
            <button
              onClick={finalizar}
              disabled={trabajando}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Finalizar
            </button>
          )}
          <button
            onClick={eliminar}
            disabled={trabajando}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {activa ? (
        <Ranking comp={comp} />
      ) : (
        <div className="text-sm">
          {comp.ganadores?.length ? (
            <ul className="space-y-1">
              {comp.ganadores.map((g) => (
                <li key={g.profesionalId} className="flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" />
                  <span>{g.nombre}</span>
                  <span className="text-slate-400">
                    ({g.completados} completados)
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">Nadie alcanzó la meta.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompetenciasPage() {
  const [comps, setComps] = useState<Competencia[] | null>(null);

  const cargar = useCallback(() => {
    listCompetencias().then(setComps);
  }, []);

  useEffect(cargar, [cargar]);

  return (
    <>
      <PageHeader
        title="Competencias"
        description="Desafíos para profesionales: al completar la meta de servicios en el período, ganan la gratificación."
      />
      <div className="space-y-4 p-6">
        <FormNueva onCreada={cargar} />
        {comps === null && (
          <p className="text-sm text-slate-400">Cargando competencias…</p>
        )}
        {comps?.length === 0 && (
          <p className="text-sm text-slate-400">
            Todavía no hay competencias. Creá la primera con el formulario de
            arriba.
          </p>
        )}
        {comps?.map((c) => (
          <CompetenciaCard key={c.id} comp={c} onCambio={cargar} />
        ))}
      </div>
    </>
  );
}
