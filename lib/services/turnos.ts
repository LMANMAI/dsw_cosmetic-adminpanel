import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Turno } from "../types";

export async function listTurnosDesde(fechaISO: string): Promise<Turno[]> {
  const q = query(collection(db, "turnos"), where("fecha", ">=", fechaISO));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turno, "id">) }));
}

export async function listTodosLosTurnos(): Promise<Turno[]> {
  const snap = await getDocs(collection(db, "turnos"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Turno, "id">) }));
}
