import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

/** Comisión por defecto si el doc config/plataforma todavía no existe. */
export const COMISION_DEFAULT = 20;

const ref = () => doc(db, "config", "plataforma");

/** Porcentaje global de comisión (0-100). */
export async function getComisionGlobal(): Promise<number> {
  const snap = await getDoc(ref());
  const pct = snap.data()?.comisionPorcentaje;
  return typeof pct === "number" ? pct : COMISION_DEFAULT;
}

export async function setComisionGlobal(pct: number): Promise<void> {
  await setDoc(ref(), { comisionPorcentaje: pct }, { merge: true });
}

/* ── Tarifa de uso de la app (la paga el CLIENTE) ──────────────────────
 * Se SUMA al precio del servicio al reservar y se cobra en el mismo
 * checkout que la seña. Arranca en 0: no se cobra nada hasta configurarla.
 */

export const TARIFA_CLIENTE_DEFAULT = 0;

/** Porcentaje global que paga el cliente sobre el valor del servicio (0-100). */
export async function getTarifaClienteGlobal(): Promise<number> {
  const snap = await getDoc(ref());
  const pct = snap.data()?.tarifaClientePorcentaje;
  return typeof pct === "number" ? pct : TARIFA_CLIENTE_DEFAULT;
}

export async function setTarifaClienteGlobal(pct: number): Promise<void> {
  await setDoc(ref(), { tarifaClientePorcentaje: pct }, { merge: true });
}

/* ── Mercado Pago ──────────────────────────────────────────────────
 * Datos de la aplicación de MP de la plataforma. El client_secret NO
 * se guarda acá: vive en Secret Manager (MP_CLIENT_SECRET) y solo lo
 * leen las Cloud Functions.
 */

/** Valores por defecto si el doc todavía no tiene los campos. */
export const MP_CLIENT_ID_DEFAULT = "8659117657714110";
/** Public key de la aplicación de MP. No es secreta: se puede exponer. */
export const MP_PUBLIC_KEY_DEFAULT =
  "APP_USR-c4656812-fec4-4c2e-9d36-e3549d7a81d4";
export const MP_COMISION_PEDIDOS_DEFAULT = 5;

export interface MpConfig {
  /** Client ID de la aplicación de Mercado Pago (no es secreto). */
  mpClientId: string;
  /** Public key de la aplicación de Mercado Pago (no es secreta). */
  mpPublicKey: string;
  /** Comisión (%) de la plataforma sobre pedidos de insumos (marketplace_fee). */
  mpComisionPedidosPorcentaje: number;
}

export async function getMpConfig(): Promise<MpConfig> {
  const snap = await getDoc(ref());
  const data = snap.data() ?? {};
  return {
    mpClientId:
      typeof data.mpClientId === "string" && data.mpClientId
        ? data.mpClientId
        : MP_CLIENT_ID_DEFAULT,
    mpPublicKey:
      typeof data.mpPublicKey === "string" && data.mpPublicKey
        ? data.mpPublicKey
        : MP_PUBLIC_KEY_DEFAULT,
    mpComisionPedidosPorcentaje:
      typeof data.mpComisionPedidosPorcentaje === "number"
        ? data.mpComisionPedidosPorcentaje
        : MP_COMISION_PEDIDOS_DEFAULT,
  };
}

export async function setMpConfig(cfg: MpConfig): Promise<void> {
  await setDoc(
    ref(),
    {
      mpClientId: cfg.mpClientId.trim(),
      mpPublicKey: cfg.mpPublicKey.trim(),
      mpComisionPedidosPorcentaje: cfg.mpComisionPedidosPorcentaje,
    },
    { merge: true },
  );
}
