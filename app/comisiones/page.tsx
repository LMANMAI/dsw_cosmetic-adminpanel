"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Percent, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ComisionModal } from "@/components/ComisionModal";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/Pagination";
import {
  getComisionGlobal,
  setComisionGlobal,
  getTarifaClienteGlobal,
  setTarifaClienteGlobal,
  getMpConfig,
  setMpConfig,
  COMISION_DEFAULT,
  TARIFA_CLIENTE_DEFAULT,
  MP_CLIENT_ID_DEFAULT,
  MP_PUBLIC_KEY_DEFAULT,
  MP_COMISION_PEDIDOS_DEFAULT,
  type MpConfig,
} from "@/lib/services/config";
import {
  listUsuarios,
  setExencionComision,
  setComisionPersonalizada,
  setExencionTarifaCliente,
  setTarifaClientePersonalizada,
  exencionVigente,
  comisionPersonalizada,
  exencionTarifaClienteVigente,
  tarifaClientePersonalizada,
} from "@/lib/services/usuarios";
import type { Usuario } from "@/lib/types";

/** Card de porcentaje global (sirve para la tarifa del pro y la del cliente). */
function GlobalCard({
  titulo,
  descripcion,
  icono,
  pct,
  onGuardar,
  onSaved,
}: {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  pct: number;
  onGuardar: (pct: number) => Promise<void>;
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
      await onGuardar(n);
      onSaved(n);
      setMsg({ ok: true, texto: "Guardado. Aplica a las próximas reservas." });
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
        {icono}
        <span className="text-xs uppercase text-slate-500">{titulo}</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">{descripcion}</p>
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
  const [publicKey, setPublicKey] = useState(cfg.mpPublicKey);
  const [pctPedidos, setPctPedidos] = useState<string>(
    String(cfg.mpComisionPedidosPorcentaje),
  );
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    setClientId(cfg.mpClientId);
    setPublicKey(cfg.mpPublicKey);
    setPctPedidos(String(cfg.mpComisionPedidosPorcentaje));
  }, [cfg]);

  async function guardar() {
    const id = clientId.trim();
    if (!/^\d{6,}$/.test(id)) {
      setMsg({ ok: false, texto: "El Client ID debe ser numérico (mínimo 6 dígitos)." });
      return;
    }
    const pk = publicKey.trim();
    if (!/^(APP_USR|TEST)-\S+$/.test(pk)) {
      setMsg({
        ok: false,
        texto: "La public key debe empezar con APP_USR- (producción) o TEST- (pruebas).",
      });
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
      const nuevo = {
        mpClientId: id,
        mpPublicKey: pk,
        mpComisionPedidosPorcentaje: n,
      };
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
        Client ID y public key de la aplicación de Mercado Pago, y tarifa de
        servicio que retiene la plataforma sobre los pedidos de insumos
        (marketplace fee). El client secret y el access token NO se administran
        desde acá: están protegidos en Secret Manager (MP_CLIENT_SECRET y
        MP_ACCESS_TOKEN) y solo los leen las Cloud Functions.
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
            Public key
          </span>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => {
              setMsg(null);
              setPublicKey(e.target.value);
            }}
            placeholder="APP_USR-..."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs"
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

type Tab = "profesionales" | "clientes";

export default function ComisionesPage() {
  const [globalPct, setGlobalPct] = useState(COMISION_DEFAULT);
  const [tarifaClientePct, setTarifaClientePct] = useState(TARIFA_CLIENTE_DEFAULT);
  const [mpCfg, setMpCfg] = useState<MpConfig>({
    mpClientId: MP_CLIENT_ID_DEFAULT,
    mpPublicKey: MP_PUBLIC_KEY_DEFAULT,
    mpComisionPedidosPorcentaje: MP_COMISION_PEDIDOS_DEFAULT,
  });
  const [tab, setTab] = useState<Tab>("profesionales");
  const [pros, setPros] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getComisionGlobal().then(setGlobalPct).catch(console.error);
    getTarifaClienteGlobal().then(setTarifaClientePct).catch(console.error);
    getMpConfig().then(setMpCfg).catch(console.error);
    cargarUsuarios();
  }, []);

  function cargarUsuarios() {
    setLoading(true);
    // Si una de las dos consultas falla (permisos, red), la otra igual se
    // muestra: la tabla nunca queda colgada en "Cargando…".
    Promise.all([
      listUsuarios("profesional").catch(() => [] as Usuario[]),
      listUsuarios("cliente").catch(() => [] as Usuario[]),
    ])
      .then(([p, c]) => {
        setPros(p);
        setClientes(c);
      })
      .finally(() => setLoading(false));
  }

  const esCliente = tab === "clientes";
  const lista = esCliente ? clientes : pros;

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter(
      (u) =>
        u.nombre?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t),
    );
  }, [lista, q]);

  const pageItems = useMemo(
    () => filtrados.slice((page - 1) * pageSize, page * pageSize),
    [filtrados, page, pageSize],
  );

  async function guardarPorcentaje(u: Usuario, pct: number | null) {
    setBusy(true);
    try {
      if (esCliente) await setTarifaClientePersonalizada(u.id, pct);
      else await setComisionPersonalizada(u.id, pct);
      cargarUsuarios();
      setEditando(null);
    } finally {
      setBusy(false);
    }
  }

  async function aplicarExencion(u: Usuario, dias: number) {
    setBusy(true);
    try {
      if (esCliente) await setExencionTarifaCliente(u.id, dias);
      else await setExencionComision(u.id, dias);
      cargarUsuarios();
      setEditando(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Tarifas de servicio"
        description="Tarifa de servicio de los profesionales, tarifa de servicio que paga el cliente y ajustes o exenciones por usuario."
      />
      <div className="space-y-4 p-6">
        <GlobalCard
          titulo="Tarifa de servicio global (profesionales)"
          descripcion="Se descuenta de lo que factura el profesional en cada servicio completado, salvo que tenga un porcentaje personalizado o una exención vigente."
          icono={<Percent size={16} className="text-brand-600" />}
          pct={globalPct}
          onGuardar={setComisionGlobal}
          onSaved={setGlobalPct}
        />
        <GlobalCard
          titulo="Tarifa de servicio al cliente"
          descripcion="Porcentaje sobre el valor del servicio que se le suma al cliente al reservar. Se cobra por Mercado Pago junto con la seña y va íntegro a la plataforma. En 0% no se le cobra nada al cliente."
          icono={<Users size={16} className="text-brand-600" />}
          pct={tarifaClientePct}
          onGuardar={setTarifaClienteGlobal}
          onSaved={setTarifaClientePct}
        />
        <MercadoPagoCard cfg={mpCfg} onSaved={setMpCfg} />

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {(["profesionales", "clientes"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setPage(1);
                  setQ("");
                }}
                className={
                  "rounded-md px-3 py-1.5 text-sm capitalize " +
                  (tab === t
                    ? "bg-white font-medium text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700")
                }
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={`Buscar ${tab} por nombre o email…`}
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="text-sm text-slate-500">
            {filtrados.length} {tab}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">
                  {"Tarifa de servicio"}
                </th>
                <th className="px-4 py-2">Exención</th>
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
                const pct = esCliente
                  ? tarifaClientePersonalizada(u)
                  : comisionPersonalizada(u);
                const hasta = esCliente
                  ? exencionTarifaClienteVigente(u)
                  : exencionVigente(u);
                const globalDeLaTabla = esCliente ? tarifaClientePct : globalPct;
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
                          {globalDeLaTabla}% (global)
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
          global={esCliente ? tarifaClientePct : globalPct}
          busy={busy}
          titulo="Tarifa de servicio"
          labelExencion={
            esCliente
              ? "Días sin tarifa de servicio (beneficio al cliente)"
              : "Premio de competencia: días sin tarifa de servicio"
          }
          pctActual={
            esCliente
              ? tarifaClientePersonalizada(editando)
              : comisionPersonalizada(editando)
          }
          exencionHasta={
            esCliente
              ? exencionTarifaClienteVigente(editando)
              : exencionVigente(editando)
          }
          onGuardarPorcentaje={(pct) => guardarPorcentaje(editando, pct)}
          onExencion={(dias) => aplicarExencion(editando, dias)}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}
