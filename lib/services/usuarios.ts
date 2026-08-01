import {
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Usuario, UserRole, PerfilProfesionalSignup } from "../types";

const COL = "usuarios";

/**
 * Lista usuarios por rol.
 *
 * Caso especial 'profesional': el `rol` es la VISTA activa, así que un
 * profesional navegando como cliente queda con rol 'cliente' y flag
 * `esProfesional: true`. Filtrar solo por rol lo dejaba fuera del panel.
 * Se hacen las dos consultas y se deduplica por id, igual que la app móvil.
 */
export async function listUsuarios(rol?: UserRole): Promise<Usuario[]> {
  if (!rol) {
    const snap = await getDocs(query(collection(db, COL)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Usuario, "id">) }));
  }

  if (rol === "profesional") {
    const [porRol, porFlag] = await Promise.all([
      getDocs(query(collection(db, COL), where("rol", "==", "profesional"))),
      getDocs(query(collection(db, COL), where("esProfesional", "==", true))),
    ]);
    const porId = new Map<string, Usuario>();
    [porRol, porFlag].forEach((snap) =>
      snap.docs.forEach((d) => {
        if (!porId.has(d.id)) {
          porId.set(d.id, { id: d.id, ...(d.data() as Omit<Usuario, "id">) });
        }
      }),
    );
    return [...porId.values()];
  }

  const snap = await getDocs(query(collection(db, COL), where("rol", "==", rol)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Usuario, "id">) }));
}

/* ── Normalización de cuentas profesionales ───────────────────────────── */

/**
 * Una cuenta "es profesional de hecho" si tiene rol profesional o si su
 * perfil tiene `especialidad` (campo que solo existe en el alta profesional).
 * Misma lógica que derivarEsProfesional() en la app móvil.
 */
export function esProfesionalDeHecho(u: Usuario): boolean {
  if (u.esProfesional === true) return true;
  if (u.rol === "profesional") return true;
  const perfil = u.perfil as PerfilProfesionalSignup | undefined;
  return !!perfil?.especialidad;
}

/**
 * true si la cuenta es profesional pero le falta el flag `esProfesional`.
 * Esas cuentas no aparecen en las búsquedas de la app ni recuperan su
 * agenda al volver a la vista profesional.
 */
export function necesitaNormalizacion(u: Usuario): boolean {
  return esProfesionalDeHecho(u) && u.esProfesional !== true;
}

/**
 * Escribe `esProfesional: true`. NO toca el rol: el rol es la vista activa
 * y cambiarlo sacaría al usuario de la vista cliente sin que él lo pida.
 */
export async function normalizarUsuario(uid: string): Promise<void> {
  await updateDoc(doc(db, COL, uid), { esProfesional: true });
}

export interface ResultadoNormalizacion {
  /** Cuentas revisadas en total. */
  revisados: number;
  /** Cuentas que estaban inconsistentes y se repararon. */
  reparados: { id: string; nombre: string; email: string; motivo: string }[];
  /** Cuentas que fallaron al escribir, con el motivo. */
  errores: { id: string; error: string }[];
}

/**
 * Barrido de toda la colección. Con `dryRun` no escribe nada: solo informa
 * qué cuentas se repararían.
 */
export async function normalizarTodos(dryRun = false): Promise<ResultadoNormalizacion> {
  const todos = await listUsuarios();
  const res: ResultadoNormalizacion = { revisados: todos.length, reparados: [], errores: [] };

  for (const u of todos) {
    if (!necesitaNormalizacion(u)) continue;
    const perfil = u.perfil as PerfilProfesionalSignup | undefined;
    const motivo =
      u.rol === "profesional"
        ? "rol = profesional sin flag esProfesional"
        : `perfil con especialidad "${perfil?.especialidad}" pero rol = ${u.rol}`;

    if (dryRun) {
      res.reparados.push({ id: u.id, nombre: u.nombre, email: u.email, motivo });
      continue;
    }
    try {
      await normalizarUsuario(u.id);
      res.reparados.push({ id: u.id, nombre: u.nombre, email: u.email, motivo });
    } catch (e) {
      res.errores.push({ id: u.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return res;
}

/**
 * Elimina el documento del usuario en Firestore. No borra su cuenta de
 * Firebase Auth (eso requiere Admin SDK); el usuario deja de existir para
 * la plataforma pero podría volver a registrarse con el mismo email.
 */
export async function eliminarUsuario(uid: string): Promise<void> {
  await deleteDoc(doc(db, COL, uid));
}

/**
 * "Inhabilitar perfil" según rol:
 *  - profesional → perfil.perfilVisible = false
 *  - proveedor   → perfil.aceptaPedidos = false
 *  - cliente     → bloqueado = true (campo nuevo a respetar en el app)
 */
export async function setHabilitado(
  uid: string,
  rol: UserRole,
  habilitado: boolean,
): Promise<void> {
  const ref = doc(db, COL, uid);
  if (rol === "profesional") {
    await updateDoc(ref, { "perfil.perfilVisible": habilitado });
  } else if (rol === "proveedor") {
    await updateDoc(ref, { "perfil.aceptaPedidos": habilitado });
  } else {
    await updateDoc(ref, { bloqueado: !habilitado });
  }
}

/**
 * Premio de competencia: exime al profesional de la comisión de la
 * plataforma hasta la fecha indicada (hoy + dias). Con dias <= 0 se
 * quita la exención. El app móvil debe respetar perfil.comisionExentaHasta
 * al calcular comisionPlataforma.
 */
export async function setExencionComision(uid: string, dias: number): Promise<void> {
  const ref = doc(db, COL, uid);
  if (dias <= 0) {
    await updateDoc(ref, { "perfil.comisionExentaHasta": null });
    return;
  }
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);
  await updateDoc(ref, {
    "perfil.comisionExentaHasta": hasta.toISOString().slice(0, 10),
  });
}

/**
 * Fija un porcentaje de comisión personalizado (0-100) para un profesional.
 * Con null vuelve a usar el porcentaje global de config/plataforma.
 */
export async function setComisionPersonalizada(
  uid: string,
  pct: number | null,
): Promise<void> {
  await updateDoc(doc(db, COL, uid), { "perfil.comisionPorcentaje": pct });
}

export function comisionPersonalizada(u: Usuario): number | null {
  const pct = (u.perfil as { comisionPorcentaje?: number } | undefined)
    ?.comisionPorcentaje;
  return typeof pct === "number" ? pct : null;
}

export function exencionVigente(u: Usuario): string | null {
  const hasta = (u.perfil as { comisionExentaHasta?: string } | undefined)
    ?.comisionExentaHasta;
  if (!hasta) return null;
  return hasta >= new Date().toISOString().slice(0, 10) ? hasta : null;
}

/* ── Tarifa de uso de la app (la paga el cliente) ─────────────────────── */

/**
 * Fija una tarifa de uso personalizada (0-100) para un cliente.
 * Con null vuelve a usar la global de config/plataforma.
 * Se guarda en `perfil` igual que el override del profesional, así una misma
 * cuenta puede tener las dos cosas sin pisarse.
 */
export async function setTarifaClientePersonalizada(
  uid: string,
  pct: number | null,
): Promise<void> {
  await updateDoc(doc(db, COL, uid), { "perfil.tarifaClientePorcentaje": pct });
}

/** Exime al cliente de la tarifa de uso por `dias` días. Con dias <= 0 la quita. */
export async function setExencionTarifaCliente(uid: string, dias: number): Promise<void> {
  const ref = doc(db, COL, uid);
  if (dias <= 0) {
    await updateDoc(ref, { "perfil.tarifaClienteExentaHasta": null });
    return;
  }
  const hasta = new Date();
  hasta.setDate(hasta.getDate() + dias);
  await updateDoc(ref, {
    "perfil.tarifaClienteExentaHasta": hasta.toISOString().slice(0, 10),
  });
}

export function tarifaClientePersonalizada(u: Usuario): number | null {
  const pct = (u.perfil as { tarifaClientePorcentaje?: number } | undefined)
    ?.tarifaClientePorcentaje;
  return typeof pct === "number" ? pct : null;
}

export function exencionTarifaClienteVigente(u: Usuario): string | null {
  const hasta = (u.perfil as { tarifaClienteExentaHasta?: string } | undefined)
    ?.tarifaClienteExentaHasta;
  if (!hasta) return null;
  return hasta >= new Date().toISOString().slice(0, 10) ? hasta : null;
}

export function estaHabilitado(u: Usuario & { bloqueado?: boolean }): boolean {
  const p = u.perfil as Record<string, unknown> | undefined;
  if (u.rol === "profesional") return (p?.perfilVisible as boolean) !== false;
  if (u.rol === "proveedor") return (p?.aceptaPedidos as boolean) !== false;
  return u.bloqueado !== true;
}
