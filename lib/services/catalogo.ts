import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { CATEGORIAS, CATALOGO_SERVICIOS } from "../data/catalogo-seed";
import type { Categoria, GeneroServicio, ServicioCatalogo } from "../types";

const CATEGORIAS_COL = "categorias";
const SERVICIOS_COL = "catalogo_servicios";

/* ─── Slugs ─── */

/**
 * Convierte un nombre en un slug estable: minúsculas, sin tildes, con guiones
 * bajos. El slug es el ID del documento en `categorias` y es lo que guardan
 * los servicios y los perfiles profesionales, así que no se puede editar
 * después de creado.
 */
export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/* ─── Categorías ─── */

export async function listCategorias(): Promise<Categoria[]> {
  const snap = await getDocs(collection(db, CATEGORIAS_COL));
  return snap.docs
    .map((d) => ({
      slug: d.id,
      nombre: (d.data().nombre as string) ?? d.id,
      emoji: (d.data().emoji as string) ?? "",
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export async function crearCategoria(datos: {
  nombre: string;
  emoji: string;
}): Promise<Categoria> {
  const slug = slugify(datos.nombre);
  if (!slug) throw new Error("El nombre no es válido.");

  const ref = doc(db, CATEGORIAS_COL, slug);
  const existe = await getDoc(ref);
  if (existe.exists()) {
    throw new Error(`Ya existe una categoría con el slug "${slug}".`);
  }

  await setDoc(ref, { nombre: datos.nombre.trim(), emoji: datos.emoji.trim() });
  return { slug, nombre: datos.nombre.trim(), emoji: datos.emoji.trim() };
}

/** Solo nombre y emoji: el slug es el ID y cambiarlo rompería referencias. */
export async function actualizarCategoria(
  slug: string,
  cambios: { nombre?: string; emoji?: string },
): Promise<void> {
  await updateDoc(doc(db, CATEGORIAS_COL, slug), cambios);
}

/**
 * Elimina una categoría. Falla si todavía tiene servicios: hay que moverlos o
 * borrarlos primero, para no dejar servicios apuntando a una categoría que ya
 * no existe.
 */
export async function eliminarCategoria(slug: string): Promise<void> {
  const cantidad = await contarServiciosDe(slug);
  if (cantidad > 0) {
    throw new Error(
      `La categoría tiene ${cantidad} servicio(s). Movelos o eliminalos antes de borrarla.`,
    );
  }
  await deleteDoc(doc(db, CATEGORIAS_COL, slug));
}

/* ─── Servicios del catálogo ─── */

export async function listServicios(
  categoriaSlug?: string,
): Promise<ServicioCatalogo[]> {
  const q = categoriaSlug
    ? query(collection(db, SERVICIOS_COL), where("categoria", "==", categoriaSlug))
    : query(collection(db, SERVICIOS_COL));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({
      id: d.id,
      nombre: (d.data().nombre as string) ?? "",
      categoria: (d.data().categoria as string) ?? "",
      duracionEstimadaMin: (d.data().duracionEstimadaMin as number) ?? 30,
      genero: (d.data().genero as GeneroServicio) ?? "unisex",
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Cantidad de servicios por categoría, para mostrar en la lista. */
export async function contarServiciosPorCategoria(): Promise<
  Record<string, number>
> {
  const snap = await getDocs(collection(db, SERVICIOS_COL));
  const conteo: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const cat = (d.data().categoria as string) ?? "";
    conteo[cat] = (conteo[cat] ?? 0) + 1;
  });
  return conteo;
}

export async function contarServiciosDe(categoriaSlug: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, SERVICIOS_COL), where("categoria", "==", categoriaSlug)),
  );
  return snap.size;
}

export async function crearServicio(datos: {
  nombre: string;
  categoria: string;
  duracionEstimadaMin: number;
  genero: GeneroServicio;
}): Promise<void> {
  await addDoc(collection(db, SERVICIOS_COL), {
    nombre: datos.nombre.trim(),
    categoria: datos.categoria,
    duracionEstimadaMin: datos.duracionEstimadaMin,
    genero: datos.genero,
  });
}

export async function actualizarServicio(
  id: string,
  cambios: {
    nombre?: string;
    categoria?: string;
    duracionEstimadaMin?: number;
    genero?: GeneroServicio;
  },
): Promise<void> {
  await updateDoc(doc(db, SERVICIOS_COL, id), cambios);
}

/**
 * Elimina un servicio del catálogo. Los servicios que los profesionales ya
 * tienen cargados (`servicios_profesional`) son copias con su propio precio,
 * así que no se ven afectados: solo deja de ofrecerse para cargas nuevas.
 */
export async function eliminarServicio(id: string): Promise<void> {
  await deleteDoc(doc(db, SERVICIOS_COL, id));
}

/* ─── Semilla ─── */

export interface ResultadoSiembra {
  categorias: number;
  servicios: number;
  yaExistia: boolean;
}

/**
 * Sube el catálogo base a Firestore. Si ya hay categorías cargadas no toca
 * nada (para no sobreescribir cambios hechos desde el panel), salvo que se
 * pase `forzar`, que hace un upsert de las categorías y servicios base.
 */
export async function sembrarCatalogo(forzar = false): Promise<ResultadoSiembra> {
  const catSnap = await getDocs(collection(db, CATEGORIAS_COL));
  if (!catSnap.empty && !forzar) {
    return { categorias: catSnap.size, servicios: 0, yaExistia: true };
  }

  const loteCategorias = writeBatch(db);
  CATEGORIAS.forEach((cat) => {
    loteCategorias.set(doc(db, CATEGORIAS_COL, cat.slug), {
      nombre: cat.nombre,
      emoji: cat.emoji,
    });
  });
  await loteCategorias.commit();

  // Los servicios base tienen id fijo (cat-N), así que forzar no duplica.
  // Firestore admite 500 operaciones por batch y el catálogo base ronda 120.
  let lote = writeBatch(db);
  let enLote = 0;
  for (const svc of CATALOGO_SERVICIOS) {
    lote.set(doc(db, SERVICIOS_COL, svc.id), {
      nombre: svc.nombre,
      categoria: svc.categoria,
      duracionEstimadaMin: svc.duracionEstimadaMin,
      genero: svc.genero ?? "unisex",
    });
    enLote++;
    if (enLote === 400) {
      await lote.commit();
      lote = writeBatch(db);
      enLote = 0;
    }
  }
  if (enLote > 0) await lote.commit();

  return {
    categorias: CATEGORIAS.length,
    servicios: CATALOGO_SERVICIOS.length,
    yaExistia: false,
  };
}
