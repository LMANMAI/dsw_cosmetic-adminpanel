"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Lightbulb,
  Percent,
  Users,
  Scissors,
  Package,
  CalendarCheck,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { listUsuarios } from "@/lib/services/usuarios";
import { listTurnosDesde } from "@/lib/services/turnos";
import { listPedidos } from "@/lib/services/pedidos";
import {
  calcularRanking,
  listCompetencias,
  type RankingItem,
} from "@/lib/services/competencias";
import type { Competencia, EstadoTurno, Pedido, Turno } from "@/lib/types";

function diasAtras(d: number) {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
}

const fmtARS = (n: number) => "$" + n.toLocaleString("es-AR");

/* ── KPI con icono y variación vs período anterior ─────────────────── */

function Delta({ actual, anterior }: { actual: number; anterior: number }) {
  if (anterior === 0 && actual === 0) return null;
  if (anterior === 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <TrendingUp size={12} /> nuevo
      </span>
    );
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  if (pct === 0)
    return <span className="text-xs font-medium text-slate-400">= igual</span>;
  const up = pct > 0;
  return (
    <span
      className={
        "inline-flex items-center gap-0.5 text-xs font-medium " +
        (up ? "text-emerald-600" : "text-rose-600")
      }
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}
      {pct}%
    </span>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
  hint,
  delta,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  hint?: string;
  delta?: { actual: number; anterior: number };
}) {
  const inner = (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-brand-500">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase text-slate-500">{title}</span>
        <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {delta && <Delta actual={delta.actual} anterior={delta.anterior} />}
      </div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ── Gráfico de barras: turnos por día (últimos 30 días) ───────────── */

function ActividadPorDia({ turnos }: { turnos: Turno[] }) {
  const dias: { fecha: string; count: number; monto: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = diasAtras(i);
    dias.push({ fecha, count: 0, monto: 0 });
  }
  const idx = new Map(dias.map((d, i) => [d.fecha, i]));
  turnos.forEach((t) => {
    const i = idx.get(t.fecha);
    if (i === undefined) return;
    dias[i].count += 1;
    if (t.estado === "completado") dias[i].monto += t.monto ?? 0;
  });
  const max = Math.max(1, ...dias.map((d) => d.count));
  const totalPeriodo = dias.reduce((s, d) => s + d.count, 0);
  const ALTO = 112; // px (coincide con h-28)

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-brand-600" />
          <span className="text-xs uppercase text-slate-500">
            Turnos por día (últimos 30 días)
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {totalPeriodo} en total · pico: {max}/día
        </span>
      </div>
      <div className="mt-4 flex h-28 items-end gap-[3px] border-b border-slate-100">
        {dias.map((d) => (
          <div
            key={d.fecha}
            title={`${fechaCorta(d.fecha)}: ${d.count} turno${d.count === 1 ? "" : "s"}${d.monto ? ` · ${fmtARS(d.monto)} facturados` : ""}`}
            className={
              "flex-1 rounded-t transition " +
              (d.count > 0
                ? "bg-brand-500 hover:bg-brand-700"
                : "bg-slate-100 hover:bg-slate-200")
            }
            style={{
              height: d.count > 0 ? Math.max(10, (d.count / max) * ALTO) : 3,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{fechaCorta(dias[0].fecha)}</span>
        <span>{fechaCorta(dias[14].fecha)}</span>
        <span>hoy</span>
      </div>
    </div>
  );
}

/* ── Desglose de turnos por estado ─────────────────────────────────── */

const ESTADO_TURNO_META: { estado: EstadoTurno; label: string; color: string }[] = [
  { estado: "completado", label: "Completados", color: "bg-sky-500" },
  { estado: "confirmado", label: "Confirmados", color: "bg-emerald-500" },
  { estado: "pendiente", label: "Pendientes", color: "bg-amber-400" },
  { estado: "pendiente_pago", label: "Pend. de pago", color: "bg-amber-300" },
  { estado: "cancelado", label: "Cancelados", color: "bg-rose-400" },
  { estado: "no_asistio", label: "No asistió", color: "bg-rose-300" },
];

function EstadoTurnos({ turnos }: { turnos: Turno[] }) {
  const total = turnos.length;
  const filas = ESTADO_TURNO_META.map((m) => ({
    ...m,
    count: turnos.filter((t) => t.estado === m.estado).length,
  })).filter((f) => f.count > 0);

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <CalendarCheck size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">
          Estado de los turnos (últimos 30 días)
        </span>
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Sin turnos en el período.</p>
      ) : (
        <>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
            {filas.map((f) => (
              <div
                key={f.estado}
                className={f.color}
                style={{ width: `${(f.count / total) * 100}%` }}
                title={`${f.label}: ${f.count}`}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {filas.map((f) => (
              <div key={f.estado} className="flex items-center gap-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${f.color}`} />
                <span className="flex-1 text-slate-600">{f.label}</span>
                <span className="tabular-nums text-slate-500">
                  {f.count}
                  <span className="ml-1 text-xs text-slate-400">
                    ({Math.round((f.count / total) * 100)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Actividad reciente ────────────────────────────────────────────── */

const BADGE_TURNO: Record<string, string> = {
  completado: "bg-sky-50 text-sky-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  pendiente: "bg-amber-50 text-amber-700",
  pendiente_pago: "bg-amber-50 text-amber-700",
  cancelado: "bg-rose-50 text-rose-700",
  no_asistio: "bg-rose-50 text-rose-700",
};

const BADGE_PEDIDO: Record<string, string> = {
  entregado: "bg-emerald-50 text-emerald-700",
  enviado: "bg-sky-50 text-sky-700",
  confirmado: "bg-emerald-50 text-emerald-700",
  pendiente: "bg-amber-50 text-amber-700",
  pendiente_pago: "bg-amber-50 text-amber-700",
  cancelado: "bg-rose-50 text-rose-700",
};

/** Formatea fechas que pueden venir como "YYYY-MM-DD" o ISO completo con hora. */
function fechaCorta(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.includes("T") ? iso : iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

function UltimosTurnos({ turnos }: { turnos: Turno[] }) {
  const ultimos = [...turnos]
    .sort((a, b) => (a.fecha + a.hora < b.fecha + b.hora ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">Turnos recientes</span>
      </div>
      <div className="mt-3 space-y-2">
        {ultimos.length === 0 && (
          <p className="text-sm text-slate-400">Sin turnos en el período.</p>
        )}
        {ultimos.map((t) => (
          <div key={t.id} className="flex items-center gap-2 text-sm">
            <span className="w-20 shrink-0 text-xs tabular-nums text-slate-400">
              {fechaCorta(t.fecha)} {t.hora}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-slate-700">
                {t.clienteNombre}
              </div>
              <div className="truncate text-xs text-slate-400">
                {t.servicioNombre}
              </div>
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-xs text-slate-500">
              {fmtARS(t.monto ?? 0)}
            </span>
            <span
              className={
                "inline-flex w-28 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs " +
                (BADGE_TURNO[t.estado] ?? "bg-slate-100 text-slate-600")
              }
            >
              {t.estado.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UltimosPedidos({ pedidos }: { pedidos: Pedido[] }) {
  const ultimos = [...pedidos]
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <ShoppingCart size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">Pedidos recientes</span>
      </div>
      <div className="mt-3 space-y-2">
        {ultimos.length === 0 && (
          <p className="text-sm text-slate-400">Sin pedidos registrados.</p>
        )}
        {ultimos.map((p) => {
          const items = p.items?.length ?? 0;
          return (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-xs tabular-nums text-slate-400">
                {fechaCorta(p.fecha)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-slate-700">
                  {p.compradorNombre || "Comprador"}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {p.proveedorNombre ? `${p.proveedorNombre} · ` : ""}
                  {items} ítem{items === 1 ? "" : "s"}
                </div>
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums text-xs text-slate-500">
                {fmtARS(p.total ?? 0)}
              </span>
              <span
                className={
                  "inline-flex w-28 shrink-0 justify-center rounded-full px-2 py-0.5 text-xs " +
                  (BADGE_PEDIDO[p.estado] ?? "bg-slate-100 text-slate-600")
                }
              >
                {p.estado.replace("_", " ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Competencia activa (sin cambios de lógica) ────────────────────── */

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

/* ── Insights (sin cambios de lógica) ──────────────────────────────── */

function calcularInsights(turnos: Turno[]): string[] {
  const out: string[] = [];
  if (!turnos.length) return out;

  const completados = turnos.filter((t) => t.estado === "completado");
  const cancelados = turnos.filter(
    (t) => t.estado === "cancelado" || t.estado === "no_asistio",
  );

  if (completados.length) {
    const monto = completados.reduce((s, t) => s + (t.monto ?? 0), 0);
    out.push(
      `Los ${completados.length} turnos completados facturaron ${fmtARS(monto)}.`,
    );
  }

  const porServicio = new Map<string, number>();
  turnos.forEach((t) =>
    porServicio.set(t.servicioNombre, (porServicio.get(t.servicioNombre) ?? 0) + 1),
  );
  const [servTop, servCant] = [...porServicio.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0];
  out.push(`El servicio más pedido fue "${servTop}" (${servCant} turnos).`);

  const tasa = Math.round((cancelados.length / turnos.length) * 100);
  if (cancelados.length) {
    out.push(
      `${tasa}% de los turnos se cancelaron o el cliente no asistió (${cancelados.length} de ${turnos.length}).`,
    );
  }

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

/* ── Tarifas de servicio recaudadas (sin cambios de lógica) ────────── */

type ResumenComision = {
  total: number;
  turnos: number;
  porOrigen: { origen: string; label: string; monto: number; turnos: number }[];
};

const ORIGEN_LABEL: Record<string, string> = {
  global: "Global",
  personalizada: "Personalizada",
  exencion: "Exención (premio)",
  sin_dato: "Sin registrar",
};

function calcularComisiones(turnos: Turno[]): ResumenComision {
  const completados = turnos.filter((t) => t.estado === "completado");
  const acc = new Map<string, { monto: number; turnos: number }>();
  let total = 0;

  for (const t of completados) {
    const origen = t.comisionOrigen ?? "sin_dato";
    const monto = t.comisionPlataforma ?? 0;
    total += monto;
    const prev = acc.get(origen) ?? { monto: 0, turnos: 0 };
    acc.set(origen, { monto: prev.monto + monto, turnos: prev.turnos + 1 });
  }

  const orden = ["global", "personalizada", "exencion", "sin_dato"];
  const porOrigen = [...acc.entries()]
    .map(([origen, v]) => ({
      origen,
      label: ORIGEN_LABEL[origen] ?? origen,
      monto: v.monto,
      turnos: v.turnos,
    }))
    .sort((a, b) => orden.indexOf(a.origen) - orden.indexOf(b.origen));

  return { total, turnos: completados.length, porOrigen };
}

function ComisionesRecaudadas({ resumen }: { resumen: ResumenComision }) {
  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <Percent size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">
          Tarifas de servicio recaudadas (últimos 30 días)
        </span>
      </div>
      <div className="mt-1 text-2xl font-semibold">{fmtARS(resumen.total)}</div>
      <div className="text-xs text-slate-400">
        {resumen.turnos} turno{resumen.turnos === 1 ? "" : "s"} completado
        {resumen.turnos === 1 ? "" : "s"}
      </div>
      <div className="mt-3 space-y-1.5">
        {resumen.porOrigen.length === 0 && (
          <p className="text-sm text-slate-400">
            Sin turnos completados en el período.
          </p>
        )}
        {resumen.porOrigen.map((o) => (
          <div
            key={o.origen}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-600">{o.label}</span>
            <span className="tabular-nums text-slate-500">
              {fmtARS(o.monto)}
              <span className="ml-1 text-xs text-slate-400">({o.turnos})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Página ────────────────────────────────────────────────────────── */

export default function HomePage() {
  const [stats, setStats] = useState<{
    profesionales: number;
    proveedores: number;
    clientes: number;
    turnos30d: number;
    turnosPrev30d: number;
    pedidos30d: number;
    pedidosPrev30d: number;
    facturacion30d: number;
    facturacionPrev30d: number;
  } | null>(null);
  const [turnos30, setTurnos30] = useState<Turno[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [insights, setInsights] = useState<string[]>([]);
  const [comisiones, setComisiones] = useState<ResumenComision | null>(null);
  const [compActiva, setCompActiva] = useState<Competencia | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);

  useEffect(() => {
    Promise.all([
      listUsuarios("profesional"),
      listUsuarios("proveedor"),
      listUsuarios("cliente"),
      listTurnosDesde(diasAtras(60)), // 60 días para comparar períodos
      listPedidos(),
    ]).then(([pro, prov, cli, tur60, ped]) => {
      const corte30 = diasAtras(30);
      const tur30 = tur60.filter((t) => t.fecha >= corte30);
      const turPrev = tur60.filter((t) => t.fecha < corte30);
      const pedidos30 = ped.filter((p) => p.fecha >= corte30);
      const pedidosPrev = ped.filter(
        (p) => p.fecha >= diasAtras(60) && p.fecha < corte30,
      );
      const facturacion = (ts: Turno[]) =>
        ts
          .filter((t) => t.estado === "completado")
          .reduce((s, t) => s + (t.monto ?? 0), 0);

      setStats({
        profesionales: pro.length,
        proveedores: prov.length,
        clientes: cli.length,
        turnos30d: tur30.length,
        turnosPrev30d: turPrev.length,
        pedidos30d: pedidos30.length,
        pedidosPrev30d: pedidosPrev.length,
        facturacion30d: facturacion(tur30),
        facturacionPrev30d: facturacion(turPrev),
      });
      setTurnos30(tur30);
      setPedidos(ped);
      setInsights(calcularInsights(tur30));
      setComisiones(calcularComisiones(tur30));
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
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Profesionales"
            value={stats?.profesionales ?? "…"}
            icon={Scissors}
            href="/profesionales"
          />
          <KpiCard
            title="Proveedores"
            value={stats?.proveedores ?? "…"}
            icon={Package}
            href="/proveedores"
          />
          <KpiCard
            title="Clientes"
            value={stats?.clientes ?? "…"}
            icon={Users}
            href="/clientes"
          />
          <KpiCard
            title="Turnos (30d)"
            value={stats?.turnos30d ?? "…"}
            icon={CalendarCheck}
            hint="vs. 30 días anteriores"
            delta={
              stats
                ? { actual: stats.turnos30d, anterior: stats.turnosPrev30d }
                : undefined
            }
          />
          <KpiCard
            title="Facturación (30d)"
            value={stats ? fmtARS(stats.facturacion30d) : "…"}
            icon={DollarSign}
            hint={
              stats && stats.turnos30d > 0 && stats.facturacion30d > 0
                ? `ticket promedio ${fmtARS(Math.round(stats.facturacion30d / Math.max(1, turnos30.filter((t) => t.estado === "completado").length)))}`
                : "turnos completados · vs. 30 días anteriores"
            }
            delta={
              stats
                ? {
                    actual: stats.facturacion30d,
                    anterior: stats.facturacionPrev30d,
                  }
                : undefined
            }
          />
          <KpiCard
            title="Pedidos (30d)"
            value={stats?.pedidos30d ?? "…"}
            icon={ShoppingCart}
            hint="vs. 30 días anteriores"
            delta={
              stats
                ? { actual: stats.pedidos30d, anterior: stats.pedidosPrev30d }
                : undefined
            }
          />
        </div>

        {/* Actividad + estados */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ActividadPorDia turnos={turnos30} />
          <EstadoTurnos turnos={turnos30} />
        </div>

        {/* Recaudación + competencia / insights */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {comisiones && <ComisionesRecaudadas resumen={comisiones} />}

          {compActiva && <CompetenciaActiva comp={compActiva} ranking={ranking} />}

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

        {/* Actividad reciente */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <UltimosTurnos turnos={turnos30} />
          <UltimosPedidos pedidos={pedidos} />
        </div>
      </div>
    </>
  );
}
