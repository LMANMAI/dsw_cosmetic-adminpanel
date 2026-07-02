import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type {
  Competencia,
  GanadorCompetencia,
  Turno,
  Usuario,
} from "../types";

const COL = "competencias";

export interface RankingItem {
  profesionalId: string;
  nombre: string;
  completados: number;
  cumplioMeta: boolean;
}

export async function listCompetencias(): Promise<Competencia[]> {
  const q = query(collection(db, COL), orderBy("creadoEn", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Competencia, "id">) }));
}

export async function crearCompetencia(data: {
  nombre: string;
  metaServicios: number;
  gratificacion: string;
  fechaInicio: string;
  fechaFin: string;
}): Promise<void> {
  await addDoc(collection(db, COL), {
    ...data,
    estado: "activa",
    creadoEn: new Date().toISOString(),
  });
}

/**
 * Calcula el ranking de una competencia contando turnos con estado
 * "completado" cuya fecha cae dentro del período. El filtro de estado se
 * hace en cliente para no requerir un índice compuesto en Firestore.
 */
export async function calcularRanking(comp: Competencia): Promise<RankingItem[]> {
  const [turnosSnap, profesionalesSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "turnos"),
        where("fecha", ">=", comp.fechaInicio),
        where("fecha", "<=", comp.fechaFin),
      ),
    ),
    getDocs(query(collection(db, "usuarios"), where("rol", "==", "profesional"))),
  ]);

  const nombres = new Map<string, string>();
  profesionalesSnap.docs.forEach((d) => {
    nombres.set(d.id, (d.data() as Usuario).nombre ?? d.id);
  });

  const conteo = new Map<string, number>();
  turnosSnap.docs.forEach((d) => {
    const t = d.data() as Turno;
    if (t.estado !== "completado") return;
    conteo.set(t.profesionalId, (conteo.get(t.profesionalId) ?? 0) + 1);
  });

  return [...conteo.entries()]
    .map(([profesionalId, completados]) => ({
      profesionalId,
      nombre: nombres.get(profesionalId) ?? profesionalId,
      completados,
      cumplioMeta: completados >= comp.metaServicios,
    }))
    .sort((a, b) => b.completados - a.completados);
}

/** Cierra la competencia guardando como ganadores a quienes cumplieron la meta. */
export async function finalizarCompetencia(comp: Competencia): Promise<GanadorCompetencia[]> {
  const ranking = await calcularRanking(comp);
  const ganadores: GanadorCompetencia[] = ranking
    .filter((r) => r.cumplioMeta)
    .map(({ profesionalId, nombre, completados }) => ({
      profesionalId,
      nombre,
      completados,
    }));
  await updateDoc(doc(db, COL, comp.id), { estado: "finalizada", ganadores });
  return ganadores;
}

export async function eliminarCompetencia(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
