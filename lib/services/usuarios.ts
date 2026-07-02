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

export function estaHabilitado(u: Usuario & { bloqueado?: boolean }): boolean {
  const p = u.perfil as Record<string, unknown> | undefined;
  if (u.rol === "profesional") return (p?.perfilVisible as boolean) !== false;
  if (u.rol === "proveedor") return (p?.aceptaPedidos as boolean) !== false;
  return u.bloqueado !== true;
}
