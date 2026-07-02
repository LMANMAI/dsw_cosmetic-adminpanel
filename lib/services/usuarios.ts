import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Usuario, UserRole } from "../types";

const COL = "usuarios";

export async function listUsuarios(rol?: UserRole): Promise<Usuario[]> {
  const q = rol
    ? query(collection(db, COL), where("rol", "==", rol))
    : query(collection(db, COL));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Usuario, "id">) }));
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

export function exencionVigente(u: Usuario): string | null {
  const hasta = (u.perfil as { comisionExentaHasta?: string } | undefined)
    ?.comisionExentaHasta;
  if (!hasta) return null;
  return hasta >= new Date().toISOString().slice(0, 10) ? hasta : null;
}

export function estaHabilitado(u: Usuario & { bloqueado?: boolean }): boolean {
  const p = u.perfil as Record<string, unknown> | undefined;
  if (u.rol === "profesional") return (p?.perfilVisible as boolean) !== false;
  if (u.rol === "proveedor") return (p?.aceptaPedidos as boolean) !== false;
  return u.bloqueado !== true;
}
