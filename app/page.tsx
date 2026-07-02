"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { listUsuarios } from "@/lib/services/usuarios";
import { listTurnosDesde } from "@/lib/services/turnos";
import { listPedidos } from "@/lib/services/pedidos";

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

export default function HomePage() {
  const [stats, setStats] = useState<{
    profesionales: number;
    proveedores: number;
    clientes: number;
    turnos30d: number;
    pedidos30d: number;
  } | null>(null);

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
    });
  }, []);

  return (
    <>
      <PageHeader title="Resumen" description="Foto general de la plataforma." />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
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
        <Card
          title="Turnos (últimos 30d)"
          value={stats?.turnos30d ?? "…"}
        />
        <Card
          title="Pedidos (últimos 30d)"
          value={stats?.pedidos30d ?? "…"}
        />
        <Card title="Mapa de calor" value="Ver" href="/mapa" />
      </div>
    </>
  );
}
