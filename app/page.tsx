"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Lightbulb } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { listUsuarios } from "@/lib/services/usuarios";
import { listTurnosDesde } from "@/lib/services/turnos";
import { listPedidos } from "@/lib/services/pedidos";
import {
  calcularRanking,
  listCompetencias,
  type RankingItem,
} from "@/lib/services/competencias";
import type { Competencia, Turno } from "@/lib/types";

function diasAtras(d: number) {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
}

function Card({
  title,
  value,
  hint,
  href,
}: {
  title: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-brand-500">
      <div className="text-xs uppercase text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** Panel con el estado de la competencia activa más reciente. */
function CompetenciaActiva({
  comp,
  ranking,
}: {
  comp: Competencia;
  ranking: RankingItem[];
}) {
  const top = ranking.slice(0, 3);
  const cumplieron = ranking.filter((r) => r.cumplioMeta).length;
  const diasRestantes = Math.max(
    0,
    Math.ceil(
      (new Date(comp.fechaFin + "T23:59:59").getTime() - Date.now()) / 86_400_000,
    ),
  );

  return (
    <Link href="/competencias" className="block">
      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-brand-500">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <span className="text-xs uppercase text-slate-500">
            Competencia activa
          </span>
        </div>
        <div className="mt-1 font-semibold">{comp.nombre}</div>
        <div className="text-xs text-slate-400">
          Meta: {comp.metaServicios} servicios · Premio: {comp.gratificacion} ·{" "}
          {diasRestantes} día{diasRestantes === 1 ? "" : "s"} restante
          {diasRestantes === 1 ? "" : "s"} ·{" "}
          {cumplieron > 0
            ? `${cumplieron} ya cumplieron la meta`
            : "nadie cumplió la meta aún"}
        </div>
        <div className="mt-3 space-y-1.5">
          {top.length === 0 && (
            <p className="text-sm text-slate-400">
              Sin servicios completados en el período todavía.
            </p>
          )}
          {top.map((r, i) => {
            const pct = Math.min(100, (r.completados / comp.metaServicios) * 100);
            return (
              <div key={r.profesionalId} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-slate-400">{i + 1}.</span>
                <span className="w-32 truncate" title={r.nombre}>
                  {r.nombre}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={
                      "h-full rounded-full " +
                      (r.cumplioMeta ? "bg-emerald-500" : "bg-brand-500")
                    }
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs tabular-nums text-slate-500">
                  {r.completados}/{comp.metaServicios}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}

/** Insights calculados sobre los turnos de los últimos 30 días. */
function calcularInsights(turnos: Turno[]): string[] {
  const out: string[] = [];
  if (!turnos.length) return out;

  const completados = turnos.filter((t) => t.estado === "completado");
  const cancelados = turnos.filter(
    (t) => t.estado === "cancelado" || t.estado === "no_asistio",
  );

  // Facturación de turnos completados
  if (completados.length) {
    const monto = completados.reduce((s, t) => s + (t.monto ?? 0), 0);
    out.push(
      `Los ${completados.length} turnos completados facturaron $${monto.toLocaleString("es-AR")}.`,
    );
  }

  // Servicio más pedido
  const porServicio = new Map<string, number>();
  turnos.forEach((t) =>
    porServicio.set(t.servicioNombre, (porServicio.get(t.servicioNombre) ?? 0) + 1),
  );
  const [servTop, servCant] = [...porServicio.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  out.push(`El servicio más pedido fue "${servTop}" (${servCant} turnos).`);

  // Tasa de cancelación / no asistencia
  const tasa = Math.round((cancelados.length / turnos.length) * 100);
  if (cancelados.length) {
    out.push(
      `${tasa}% de los turnos se cancelaron o el cliente no asistió (${cancelados.length} de ${turnos.length}).`,
    );
  }

  // Profesional con más completados
  if (completados.length) {
    const porPro = new Map<string, number>();
    completados.forEach((t) =>
      porPro.set(t.profesionalId, (porPro.get(t.profesionalId) ?? 0) + 1),
    );
    const max = Math.max(...porPro.values());
    if (max >= 2) {
      out.push(
        `El profesional más activo completó ${max} servicios en 30 días.`,
      );
    }
  }

  return out;
}

export default function HomePage() {
  const [stats, setStats] = useState<{
    profesionales: number;
    proveedores: number;
    clientes: number;
    turnos30d: number;
    pedidos30d: number;
  } | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [compActiva, setCompActiva] = useState<Competencia | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  useEffect(() => {
    Promise.all([
      listUsuarios("profesional"),
      listUsuarios("proveedor"),
      listUsuarios("cliente"),
      listTurnosDesde(diasAtras(30)),
      listPedidos(),
    ]).then(([pro, prov, cli, tur, ped]) => {
      const corte = diasAtras(30);
      setStats({
        profesionales: pro.length,
        proveedores: prov.length,
        clientes: cli.length,
        turnos30d: tur.length,
        pedidos30d: ped.filter((p) => p.fecha >= corte).length,
      });
      setInsights(calcularInsights(tur));
    });

    listCompetencias().then(async (comps) => {
      const activa = comps.find((c) => c.estado === "activa") ?? null;
      setCompActiva(activa);
      if (activa) setRanking(await calcularRanking(activa));
    });
  }, []);

  return (
    <>
      <PageHeader title="Resumen" description="Foto general de la plataforma." />
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            title="Profesionales"
            value={stats?.profesionales ?? "…"}
            href="/profesionales"
          />
          <Card
            title="Proveedores"
            value={stats?.proveedores ?? "…"}
            href="/proveedores"
          />
          <Card title="Clientes" value={stats?.clientes ?? "…"} href="/clientes" />
          <Card title="Turnos (últimos 30d)" value={stats?.turnos30d ?? "…"} />
          <Card title="Pedidos (últimos 30d)" value={stats?.pedidos30d ?? "…"} />
          <Card title="Mapa de calor" value="Ver" href="/mapa" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {compActiva && (
            <CompetenciaActiva comp={compActiva} ranking={ranking} />
          )}

          {insights.length > 0 && (
            <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center gap-2">
                <Lightbulb size={16} className="text-brand-600" />
                <span className="text-xs uppercase text-slate-500">
                  Insights (últimos 30 días)
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {insights.map((txt, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="text-brand-500">•</span>
                    {txt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
