"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { listUsuarios } from "@/lib/services/usuarios";
import { listTurnosDesde } from "@/lib/services/turnos";
import { listPedidos } from "@/lib/services/pedidos";
import type { Usuario, Turno, Pedido } from "@/lib/types";

// Leaflet sólo en el cliente
const HeatLayer = dynamic(() => import("./HeatLayer").then((m) => m.HeatLayer), {
  ssr: false,
});
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

type Capa = "profesionales" | "turnos" | "pedidos";

type Punto = { lat: number; lng: number; peso: number; label: string };

function diasAtrasISO(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export function MapaCalor() {
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);
  const [proveedores, setProveedores] = useState<Usuario[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  const [ventanaDias, setVentanaDias] = useState<7 | 30 | 90>(30);
  const [capas, setCapas] = useState<Record<Capa, boolean>>({
    profesionales: true,
    turnos: true,
    pedidos: true,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listUsuarios("profesional"),
      listUsuarios("proveedor"),
      listTurnosDesde(diasAtrasISO(ventanaDias)),
      listPedidos(),
    ])
      .then(([prof, prov, t, p]) => {
        setProfesionales(prof);
        setProveedores(prov);
        setTurnos(t);
        setPedidos(p);
      })
      .finally(() => setLoading(false));
  }, [ventanaDias]);

  /** Mapa uid -> {lat,lng,nombre} para resolver lat/lng de turnos vía profesional */
  const profIndex = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; nombre: string }>();
    for (const u of profesionales) {
      const p = u.perfil as any;
      if (p?.latitud != null && p?.longitud != null) {
        m.set(u.id, { lat: p.latitud, lng: p.longitud, nombre: u.nombre });
      }
    }
    return m;
  }, [profesionales]);

  const proveedorIndex = useMemo(() => {
    const m = new Map<string, { lat: number; lng: number; nombre: string }>();
    for (const u of proveedores) {
      const p = u.perfil as any;
      if (p?.latitud != null && p?.longitud != null) {
        m.set(u.id, { lat: p.latitud, lng: p.longitud, nombre: u.nombre });
      }
    }
    return m;
  }, [proveedores]);

  const puntosProfesionales = useMemo<Punto[]>(() => {
    return Array.from(profIndex.entries()).map(([_, v]) => ({
      lat: v.lat,
      lng: v.lng,
      peso: 0.5,
      label: v.nombre,
    }));
  }, [profIndex]);

  const corteISO = diasAtrasISO(ventanaDias);
  const puntosTurnos = useMemo<Punto[]>(() => {
    return turnos
      .filter((t) => t.estado !== "cancelado" && t.fecha >= corteISO)
      .map((t) => {
        const p = profIndex.get(t.profesionalId);
        if (!p) return null;
        return {
          lat: p.lat,
          lng: p.lng,
          peso: t.estado === "completado" ? 1 : 0.6,
          label: `${t.servicioNombre} (${t.fecha})`,
        };
      })
      .filter((x): x is Punto => x !== null);
  }, [turnos, profIndex, corteISO]);

  const puntosPedidos = useMemo<Punto[]>(() => {
    return pedidos
      .filter((p) => p.fecha >= corteISO && p.estado !== "cancelado")
      .map((p) => {
        const prov = proveedorIndex.get(p.proveedorId);
        if (!prov) return null;
        return {
          lat: prov.lat,
          lng: prov.lng,
          peso: 0.8,
          label: `Pedido $${p.total} (${p.fecha?.slice(0, 10)})`,
        };
      })
      .filter((x): x is Punto => x !== null);
  }, [pedidos, proveedorIndex, corteISO]);

  const todosLosPuntos: [number, number, number][] = [
    ...(capas.profesionales ? puntosProfesionales : []),
    ...(capas.turnos ? puntosTurnos : []),
    ...(capas.pedidos ? puntosPedidos : []),
  ].map((p) => [p.lat, p.lng, p.peso]);

  /** Centro: promedio simple de puntos, o Buenos Aires por defecto */
  const center: [number, number] = useMemo(() => {
    if (todosLosPuntos.length === 0) return [-34.6037, -58.3816];
    const lat = todosLosPuntos.reduce((a, p) => a + p[0], 0) / todosLosPuntos.length;
    const lng = todosLosPuntos.reduce((a, p) => a + p[1], 0) / todosLosPuntos.length;
    return [lat, lng];
  }, [todosLosPuntos]);

  const stats = {
    profesionalesConGeo: profIndex.size,
    profesionalesTotal: profesionales.length,
    turnos: puntosTurnos.length,
    pedidos: puntosPedidos.length,
  };

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col">
      <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Ventana:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setVentanaDias(d as 7 | 30 | 90)}
              className={
                "rounded-full px-3 py-1 text-xs " +
                (ventanaDias === d
                  ? "bg-brand text-white"
                  : "border border-slate-200 hover:bg-slate-100")
              }
            >
              {d}d
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Capas:</span>
          {(["profesionales", "turnos", "pedidos"] as Capa[]).map((c) => (
            <label key={c} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={capas[c]}
                onChange={(e) =>
                  setCapas((prev) => ({ ...prev, [c]: e.target.checked }))
                }
              />
              {c}
            </label>
          ))}
        </div>

        <div className="ml-auto text-xs text-slate-500">
          {loading
            ? "Cargando…"
            : `Profesionales c/geo: ${stats.profesionalesConGeo}/${stats.profesionalesTotal} · Turnos: ${stats.turnos} · Pedidos: ${stats.pedidos}`}
        </div>
      </div>

      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={11}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {todosLosPuntos.length > 0 && (
            <HeatLayer points={todosLosPuntos} radius={28} blur={20} maxZoom={17} />
          )}
          {capas.profesionales &&
            puntosProfesionales.map((p, i) => (
              <CircleMarker
                key={`p-${i}`}
                center={[p.lat, p.lng]}
                radius={4}
                pathOptions={{ color: "#7c3aed", fillOpacity: 0.8 }}
              >
                <Popup>{p.label}</Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
