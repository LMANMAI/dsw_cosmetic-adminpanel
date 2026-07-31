import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Gratificacion } from "../types";

const COL = "gratificaciones";

/** Lista las gratificaciones de un profesional, más recientes primero. */
export async function listGratificaciones(
  profesionalId: string,
): Promise<Gratificacion[]> {
  const q = query(collection(db, COL), where("profesionalId", "==", profesionalId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Gratificacion, "id">) }))
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
}

/** Registra una gratificación pendiente de transferir. */
export async function crearGratificacion(datos: {
  profesionalId: string;
  profesionalNombre: string;
  monto: number;
  motivo: string;
}): Promise<void> {
  await addDoc(collection(db, COL), {
    ...datos,
    estado: "pendiente",
    creadoEn: new Date().toISOString(),
  });
}

/** Marca una gratificación como transferida (o la vuelve a pendiente). */
export async function setEstadoGratificacion(
  id: string,
  estado: "pendiente" | "transferida",
): Promise<void> {
  await updateDoc(doc(db, COL, id), {
    estado,
    transferidaEn: estado === "transferida" ? new Date().toISOString() : null,
  });
}
