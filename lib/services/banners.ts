import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Banner } from "../types";

const COL = "banners";

/** Todos los banners, ordenados por `orden` (los inactivos también). */
export async function listBanners(): Promise<Banner[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        titulo: (data.titulo as string) ?? "",
        subtitulo: (data.subtitulo as string) ?? "",
        imagenUrl: (data.imagenUrl as string) ?? "",
        categoriaSlug: (data.categoriaSlug as string) || undefined,
        orden: typeof data.orden === "number" ? data.orden : 0,
        activo: data.activo !== false,
        creadoEn: data.creadoEn as string | undefined,
      };
    })
    .sort((a, b) => a.orden - b.orden);
}

export type BannerInput = Omit<Banner, "id" | "creadoEn">;

export async function crearBanner(datos: BannerInput): Promise<void> {
  await addDoc(collection(db, COL), {
    ...datos,
    // Firestore no acepta undefined: si no hay categoría, se guarda null.
    categoriaSlug: datos.categoriaSlug ?? null,
    creadoEn: new Date().toISOString(),
  });
}

export async function actualizarBanner(
  id: string,
  datos: Partial<BannerInput>,
): Promise<void> {
  const limpio: Record<string, unknown> = { ...datos };
  if ("categoriaSlug" in datos) {
    limpio.categoriaSlug = datos.categoriaSlug ?? null;
  }
  await updateDoc(doc(db, COL, id), limpio);
}

export async function eliminarBanner(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
