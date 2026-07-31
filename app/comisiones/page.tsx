"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Percent } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ComisionModal } from "@/components/ComisionModal";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/Pagination";
import {
  getComisionGlobal,
  setComisionGlobal,
  getMpConfig,
  setMpConfig,
  COMISION_DEFAULT,
  MP_CLIENT_ID_DEFAULT,
  MP_COMISION_PEDIDOS_DEFAULT,
  type MpConfig,
} from "@/lib/services/config";
import {
  listUsuarios,
  setExencionComision,
  setComisionPersonalizada,
  exencionVigente,
  comisionPersonalizada,
} from "@/lib/services/usuarios";
import type { Usuario } from "@/lib/types";

function GlobalCard({
  pct,
  onSaved,
}: {
  pct: number;
  onSaved: (nuevo: number) => void;
}) {
  const [valor, setValor] = useState<string>(String(pct));
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => setValor(String(pct)), [pct]);

  async function guardar() {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setMsg({ ok: false, texto: "Ingresá un porcentaje entre 0 y 100." });
      return;
    }
    setGuardando(true);
    setMsg(null);
    try {
      await setComisionGlobal(n);
      onSaved(n);
      setMsg({ ok: true, texto: "Guardado. Aplica a los próximos turnos completados." });
    } catch (err) {
      setMsg({
        ok: false,
        texto: err instanceof Error ? err.message : "Error al guardar.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <Percent size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">
          Tarifa de servicio global de la plataforma
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Tarifa de servicio que se cobra sobre cada servicio completado, salvo
        que el profesional tenga un porcentaje personalizado o una exención
        vigente.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={valor}
          onChange={(e) => {
            setMsg(null);
            setValor(e.target.value);
          }}
          className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <span className="text-sm text-slate-500">%</span>
        <button
          onClick={guardar}
          disabled={guardando}
          className="ml-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {msg && (
        <p
          className={
            "mt-2 text-sm " + (msg.ok ? "text-emerald-600" : "text-red-600")
          }
        >
          {msg.texto}
        </p>
      )}
    </div>
  );
}

function MercadoPagoCard({
  cfg,
  onSaved,
}: {
  cfg: MpConfig;
  onSaved: (nuevo: MpConfig) => void;
}) {
  const [clientId, setClientId] = useState(cfg.mpClientId);
  const [pctPedidos, setPctPedidos] = useState<string>(
    String(cfg.mpComisionPedidosPorcentaje),
  );
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    setClientId(cfg.mpClientId);
    setPctPedidos(String(cfg.mpComisionPedidosPorcentaje));
  }, [cfg]);

  async function guardar() {
    const id = clientId.trim();
    if (!/^\d{6,}$/.test(id)) {
      setMsg({ ok: false, texto: "El Client ID debe ser numérico (mínimo 6 dígitos)." });
      return;
    }
    const n = Number(pctPedidos);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setMsg({ ok: false, texto: "Ingresá una tarifa entre 0 y 100." });
      return;
    }
    setGuardando(true);
    setMsg(null);
    try {
      const nuevo = { mpClientId: id, mpComisionPedidosPorcentaje: n };
      await setMpConfig(nuevo);
      onSaved(nuevo);
      setMsg({ ok: true, texto: "Guardado. Aplica a las próximas operaciones." });
    } catch (err) {
      setMsg({
        ok: false,
        texto: err instanceof Error ? err.message : "Error al guardar.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <CreditCard size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">Mercado Pago</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Client ID de la aplicación de Mercado Pago y tarifa de servicio que
        retiene la plataforma sobre los pedidos de insumos (marketplace fee).
        El client secret no se administra desde acá: está protegido en Secret
        Manager.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Client ID</span>
          <input
            type="text"
            value={clientId}
            onChange={(e) => {
              setMsg(null);
              setClientId(e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">
            Tarifa pedidos de insumos (%)
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={pctPedidos}
              onChange={(e) => {
                setMsg(null);
                setPctPedidos(e.target.value);
              }}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
        </label>
      </div>
      <div className="mt-4">
        <button
          onClick={guardar}
          disabled={guardando}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {msg && (
        <p
          className={
            "mt-2 text-sm " + (msg.ok ? "text-emerald-600" : "text-red-600")
          }
        >
          {msg.texto}
        </p>
      )}
    </div>
  );
}

export default function ComisionesPage() {
  const [globalPct, setGlobalPct] = useState(COMISION_DEFAULT);
  const [mpCfg, setMpCfg] = useState<MpConfig>({
    mpClientId: MP_CLIENT_ID_DEFAULT,
    mpComisionPedidosPorcentaje: MP_COMISION_PEDIDOS_DEFAULT,
  });
  const [pros, setPros] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getComisionGlobal().then(setGlobalPct);
    getMpConfig().then(setMpCfg);
    cargarPros();
  }, []);

  function cargarPros() {
    setLoading(true);
    listUsuarios("profesional")
      .then(setPros)
      .finally(() => setLoading(false));
  }

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return pros;
    return pros.filter(
      (u) =>
        u.nombre?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t),
    );
  }, [pros, q]);

  const pageItems = useMemo(
    () => filtrados.slice((page - 1) * pageSize, page * pageSize),
    [filtrados, page, pageSize],
  );

  async function guardarPorcentaje(u: Usuario, pct: number | null) {
    setBusy(true);
    try {
      await setComisionPersonalizada(u.id, pct);
      cargarPros();
      setEditando(null);
    } finally {
      setBusy(false);
    }
  }

  async function aplicarExencion(u: Usuario, dias: number) {
    setBusy(true);
    try {
      await setExencionComision(u.id, dias);
      cargarPros();
      setEditando(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tarifas de servicio"
        description="Porcentaje global de la plataforma y tarifas personalizadas o exenciones (premios) por profesional."
      />
      <div className="space-y-4 p-6">
        <GlobalCard pct={globalPct} onSaved={setGlobalPct} />
        <MercadoPagoCard cfg={mpCfg} onSaved={setMpCfg} />

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar profesional por nombre o email…"
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-slate-500">
            {filtrados.length} profesionales
          </span>
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Tarifa de servicio</th>
                <th className="px-4 py-2">Exención (premio)</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Sin resultados
                  </td>
                </tr>
              )}
              {pageItems.map((u) => {
                const pct = comisionPersonalizada(u);
                const hasta = exencionVigente(u);
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{u.nombre || "—"}</td>
                    <td className="px-4 py-2 text-slate-600">{u.email}</td>
                    <td className="px-4 py-2">
                      {pct !== null ? (
                        <span className="inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                          {pct}% personalizada
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          {globalPct}% (global)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {hasta ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Exento hasta {hasta}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setEditando(u)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs hover:bg-slate-100"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination
            total={filtrados.length}
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

      {editando && (
        <ComisionModal
          usuario={editando}
          global={globalPct}
          busy={busy}
          onGuardarPorcentaje={(pct) => guardarPorcentaje(editando, pct)}
          onExencion={(dias) => aplicarExencion(editando, dias)}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}
