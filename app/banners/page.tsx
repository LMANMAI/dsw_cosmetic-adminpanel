"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/Pagination";
import {
  actualizarBanner,
  crearBanner,
  eliminarBanner,
  listBanners,
  type BannerInput,
} from "@/lib/services/banners";
import { listCategorias } from "@/lib/services/catalogo";
import { uploadImagen } from "@/lib/services/upload";
import type { Banner, Categoria } from "@/lib/types";

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
const btnPrimary =
  "flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
const btnIcon =
  "rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50";

const VACIO: BannerInput = {
  titulo: "",
  subtitulo: "",
  imagenUrl: "",
  categoriaSlug: undefined,
  orden: 0,
  activo: true,
};

/** Vista previa con la misma proporción que la tarjeta del home de la app. */
function Preview({ url, titulo, subtitulo }: { url: string; titulo: string; subtitulo?: string }) {
  return (
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-slate-100">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-slate-400">
          Sin imagen
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/75 to-slate-900/10" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">YOFI</p>
        <p className="text-lg font-bold leading-tight text-white">
          {titulo || "Título del banner"}
        </p>
        {subtitulo && <p className="text-xs text-white/90">{subtitulo}</p>}
      </div>
    </div>
  );
}

/** Formulario de alta/edición. */
function BannerForm({
  valor,
  categorias,
  guardando,
  onChange,
  onGuardar,
  onCancelar,
}: {
  valor: BannerInput;
  categorias: Categoria[];
  guardando: boolean;
  onChange: (v: BannerInput) => void;
  onGuardar: () => void;
  onCancelar?: () => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(file: File | undefined) {
    if (!file) return;
    setError("");
    setSubiendo(true);
    try {
      const url = await uploadImagen(file, "banners");
      onChange({ ...valor, imagenUrl: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Título</span>
          <input
            className={input + " mt-1"}
            value={valor.titulo}
            onChange={(e) => onChange({ ...valor, titulo: e.target.value })}
            placeholder="Alisados hasta 30% OFF"
            maxLength={60}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">
            Subtítulo <span className="text-slate-400">(opcional)</span>
          </span>
          <input
            className={input + " mt-1"}
            value={valor.subtitulo ?? ""}
            onChange={(e) => onChange({ ...valor, subtitulo: e.target.value })}
            placeholder="Reservá con las mejores profesionales de tu zona"
            maxLength={90}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Lleva a</span>
            <select
              className={input + " mt-1"}
              value={valor.categoriaSlug ?? ""}
              onChange={(e) =>
                onChange({ ...valor, categoriaSlug: e.target.value || undefined })
              }
            >
              <option value="">No navega</option>
              {categorias.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Orden</span>
            <input
              type="number"
              className={input + " mt-1"}
              value={valor.orden}
              onChange={(e) => onChange({ ...valor, orden: Number(e.target.value) })}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={valor.activo}
            onChange={(e) => onChange({ ...valor, activo: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visible en la app
        </label>
      </div>

      <div className="space-y-3">
        <Preview url={valor.imagenUrl} titulo={valor.titulo} subtitulo={valor.subtitulo} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <ImagePlus size={16} />
            {subiendo ? "Subiendo…" : valor.imagenUrl ? "Cambiar imagen" : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => subir(e.target.files?.[0])}
            />
          </label>
          <button
            onClick={onGuardar}
            disabled={guardando || subiendo || !valor.titulo.trim() || !valor.imagenUrl}
            className={btnPrimary}
            title={!valor.imagenUrl ? "Subí una imagen primero" : undefined}
          >
            <Plus size={16} />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {onCancelar && (
            <button onClick={onCancelar} className={btnIcon} title="Cancelar">
              <X size={16} />
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Ideal 1200×600 px (proporción 2:1). El texto se dibuja encima, así que
          dejá el lado izquierdo despejado.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState<BannerInput>(VACIO);
  const [editando, setEditando] = useState<Banner | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);

  const cargar = useCallback(() => {
    setLoading(true);
    listBanners()
      .then(setBanners)
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
    listCategorias().then(setCategorias).catch(() => setCategorias([]));
  }, [cargar]);

  const paginas = Math.max(1, Math.ceil(banners.length / pageSize));
  useEffect(() => {
    if (page > paginas) setPage(paginas);
  }, [page, paginas]);

  const pageItems = useMemo(
    () => banners.slice((page - 1) * pageSize, page * pageSize),
    [banners, page, pageSize],
  );

  async function guardarNuevo() {
    setGuardando(true);
    try {
      // Por defecto va al final del carrusel.
      const orden = nuevo.orden || banners.length + 1;
      await crearBanner({ ...nuevo, orden });
      setNuevo(VACIO);
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion() {
    if (!editando) return;
    setGuardando(true);
    try {
      const { id, creadoEn, ...datos } = editando;
      void creadoEn;
      await actualizarBanner(id, datos);
      setEditando(null);
      cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(b: Banner) {
    await actualizarBanner(b.id, { activo: !b.activo });
    cargar();
  }

  async function borrar(b: Banner) {
    if (!confirm(`¿Eliminar el banner "${b.titulo}"?`)) return;
    await eliminarBanner(b.id);
    cargar();
  }

  return (
    <>
      <PageHeader
        title="Banners del home"
        description="Imágenes promocionales que se muestran en el inicio de la app del cliente. Se ordenan por el campo Orden y solo aparecen las que están visibles."
      />
      <div className="space-y-4 p-6">
        <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <div className="mb-4 flex items-center gap-2">
            <ImagePlus size={16} className="text-brand-600" />
            <span className="text-xs uppercase text-slate-500">Nuevo banner</span>
          </div>
          <BannerForm
            valor={nuevo}
            categorias={categorias}
            guardando={guardando}
            onChange={setNuevo}
            onGuardar={guardarNuevo}
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-semibold">
              Banners cargados{" "}
              <span className="font-normal text-slate-400">({banners.length})</span>
            </span>
          </div>

          {loading && (
            <p className="px-5 pb-5 text-sm text-slate-400">Cargando…</p>
          )}
          {!loading && banners.length === 0 && (
            <p className="px-5 pb-5 text-sm text-slate-400">
              Todavía no hay banners. Cargá el primero con el formulario de arriba.
            </p>
          )}

          <div className="divide-y divide-slate-100">
            {pageItems.map((b) => (
              <div key={b.id} className="p-5">
                {editando?.id === b.id ? (
                  <BannerForm
                    valor={editando}
                    categorias={categorias}
                    guardando={guardando}
                    onChange={(v) => setEditando({ ...editando, ...v })}
                    onGuardar={guardarEdicion}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <GripVertical size={14} />
                      {b.orden}
                    </span>
                    <div className="w-40 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.imagenUrl}
                        alt=""
                        className="aspect-[2/1] w-full rounded-lg object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{b.titulo}</p>
                      {b.subtitulo && (
                        <p className="truncate text-sm text-slate-500">{b.subtitulo}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {b.categoriaSlug
                          ? `Lleva a: ${
                              categorias.find((c) => c.slug === b.categoriaSlug)?.nombre ??
                              b.categoriaSlug
                            }`
                          : "No navega al tocarlo"}
                      </p>
                    </div>
                    <button
                      onClick={() => alternarActivo(b)}
                      className={
                        "rounded-full px-2.5 py-0.5 text-xs " +
                        (b.activo
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                      }
                      title="Mostrar u ocultar en la app"
                    >
                      {b.activo ? "Visible" : "Oculto"}
                    </button>
                    <button
                      onClick={() => setEditando(b)}
                      className={btnIcon}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => borrar(b)}
                      className={btnIcon + " hover:bg-red-50 hover:text-red-600"}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Pagination
            total={banners.length}
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
    </>
  );
}
