"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CloudUpload,
  ImagePlus,
  Pencil,
  Plus,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Pagination, PAGE_SIZE_DEFAULT } from "@/components/Pagination";
import { uploadImagen } from "@/lib/services/upload";
import {
  actualizarCategoria,
  actualizarServicio,
  contarServiciosPorCategoria,
  crearCategoria,
  crearServicio,
  eliminarCategoria,
  eliminarServicio,
  listCategorias,
  listServicios,
  sembrarCatalogo,
  slugify,
} from "@/lib/services/catalogo";
import type { Categoria, GeneroServicio, ServicioCatalogo } from "@/lib/types";

const GENEROS: GeneroServicio[] = ["unisex", "femenino", "masculino"];

const input =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none";
const btnPrimary =
  "flex items-center gap-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50";
const btnIcon =
  "rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50";

/* ─── Semilla ─── */

function SeedCard({ vacio, onListo }: { vacio: boolean; onListo: () => void }) {
  const [trabajando, setTrabajando] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function sembrar(forzar: boolean) {
    if (
      forzar &&
      !confirm(
        "Reponer el catálogo base sobreescribe nombre, duración y género de los servicios base. Los servicios que creaste desde el panel no se tocan. ¿Continuar?",
      )
    ) {
      return;
    }
    setTrabajando(true);
    setMsg(null);
    try {
      const res = await sembrarCatalogo(forzar);
      setMsg(
        res.yaExistia
          ? {
              ok: false,
              texto: `El catálogo ya tiene ${res.categorias} categorías. Usá "Reponer catálogo base" si querés volver a subir los datos base.`,
            }
          : {
              ok: true,
              texto: `Listo: ${res.categorias} categorías y ${res.servicios} servicios subidos.`,
            },
      );
      onListo();
    } catch (err) {
      setMsg({
        ok: false,
        texto: err instanceof Error ? err.message : "Error al sembrar.",
      });
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <CloudUpload size={16} className="text-brand-600" />
        <span className="text-xs uppercase text-slate-500">Catálogo base</span>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Sube a Firestore las categorías y servicios base de YOFI. Los
        profesionales eligen de este catálogo los servicios que ofrecen y les
        ponen su precio.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => sembrar(false)}
          disabled={trabajando || !vacio}
          className={btnPrimary}
          title={vacio ? undefined : "Ya hay categorías cargadas"}
        >
          <CloudUpload size={16} />
          {trabajando ? "Subiendo…" : "Sembrar catálogo base"}
        </button>
        {!vacio && (
          <button
            onClick={() => sembrar(true)}
            disabled={trabajando}
            className={btnGhost}
          >
            Reponer catálogo base
          </button>
        )}
      </div>
      {msg && (
        <p
          className={
            "mt-2 text-sm " + (msg.ok ? "text-emerald-600" : "text-amber-600")
          }
        >
          {msg.texto}
        </p>
      )}
    </div>
  );
}

/* ─── Categorías ─── */

function CategoriasCard({
  categorias,
  conteos,
  onCambio,
}: {
  categorias: Categoria[];
  conteos: Record<string, number>;
  onCambio: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [emoji, setEmoji] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const slugPreview = useMemo(() => slugify(nombre), [nombre]);

  /** Sube la foto que se muestra en el home de la app para esa categoría. */
  async function subirFoto(cat: Categoria, file: File | undefined) {
    if (!file) return;
    setError("");
    setSubiendo(cat.slug);
    try {
      const url = await uploadImagen(file, "categorias");
      await actualizarCategoria(cat.slug, { imagenUrl: url });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(null);
    }
  }

  // Si se borran categorías y la página actual queda vacía, volvemos atrás.
  const paginas = Math.max(1, Math.ceil(categorias.length / pageSize));
  useEffect(() => {
    if (page > paginas) setPage(paginas);
  }, [page, paginas]);

  const categoriasPagina = useMemo(
    () => categorias.slice((page - 1) * pageSize, page * pageSize),
    [categorias, page, pageSize],
  );

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("Escribí un nombre.");
      return;
    }
    setTrabajando(true);
    try {
      await crearCategoria({ nombre, emoji: emoji || "✨" });
      setNombre("");
      setEmoji("");
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear.");
    } finally {
      setTrabajando(false);
    }
  }

  function empezarEdicion(cat: Categoria) {
    setEditando(cat.slug);
    setEditNombre(cat.nombre);
    setEditEmoji(cat.emoji);
    setError("");
  }

  async function guardarEdicion(slug: string) {
    if (!editNombre.trim()) {
      setError("El nombre no puede quedar vacío.");
      return;
    }
    setTrabajando(true);
    try {
      await actualizarCategoria(slug, {
        nombre: editNombre.trim(),
        emoji: editEmoji.trim(),
      });
      setEditando(null);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setTrabajando(false);
    }
  }

  async function borrar(cat: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"?`)) return;
    setError("");
    setTrabajando(true);
    try {
      await eliminarCategoria(cat.slug);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-3 flex items-center gap-2">
        <Tags size={16} className="text-brand-600" />
        <span className="text-sm font-semibold">
          Categorías{" "}
          <span className="font-normal text-slate-400">
            ({categorias.length})
          </span>
        </span>
      </div>

      <form onSubmit={crear} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="w-20">
          <label className="mb-1 block text-xs text-slate-500">Emoji</label>
          <input
            className={input}
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="💅"
            maxLength={4}
          />
        </div>
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-xs text-slate-500">
            Nombre de la categoría
          </label>
          <input
            className={input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Podología"
          />
        </div>
        <button type="submit" disabled={trabajando} className={btnPrimary}>
          <Plus size={16} />
          Agregar
        </button>
      </form>
      {slugPreview && (
        <p className="-mt-3 mb-3 text-xs text-slate-400">
          Slug: <code className="text-slate-500">{slugPreview}</code> · no se
          puede cambiar después
        </p>
      )}

      <div className="divide-y divide-slate-100">
        {categorias.length === 0 && (
          <p className="py-2 text-sm text-slate-400">
            Todavía no hay categorías. Sembrá el catálogo base o creá la
            primera.
          </p>
        )}
        {categoriasPagina.map((cat) => {
          const enEdicion = editando === cat.slug;
          const cantidad = conteos[cat.slug] ?? 0;
          return (
            <div
              key={cat.slug}
              className="flex flex-wrap items-center gap-2 py-2 text-sm"
            >
              {enEdicion ? (
                <>
                  <input
                    className={input + " w-16"}
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    maxLength={4}
                  />
                  <input
                    className={input + " w-56"}
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                  />
                  <button
                    onClick={() => guardarEdicion(cat.slug)}
                    disabled={trabajando}
                    className={btnIcon}
                    title="Guardar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    className={btnIcon}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  {cat.imagenUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.imagenUrl}
                      alt=""
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg">
                      {cat.emoji}
                    </span>
                  )}
                  <span className="min-w-40 font-medium">{cat.nombre}</span>
                  <code className="text-xs text-slate-400">{cat.slug}</code>
                  <span className="ml-auto text-xs text-slate-500">
                    {cantidad} servicio{cantidad === 1 ? "" : "s"}
                  </span>
                  <label
                    className={btnIcon + " cursor-pointer"}
                    title={cat.imagenUrl ? "Cambiar foto del home" : "Subir foto para el home"}
                  >
                    {subiendo === cat.slug ? (
                      <span className="block h-3.5 w-3.5 animate-pulse rounded-full bg-slate-300" />
                    ) : (
                      <ImagePlus size={14} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => subirFoto(cat, e.target.files?.[0])}
                    />
                  </label>
                  <button
                    onClick={() => empezarEdicion(cat)}
                    className={btnIcon}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => borrar(cat)}
                    disabled={trabajando}
                    className={
                      btnIcon + " hover:bg-red-50 hover:text-red-600"
                    }
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="-mx-5 -mb-5 mt-3 overflow-hidden rounded-b-xl">
        <Pagination
          total={categorias.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Servicios ─── */

function ServiciosCard({
  categorias,
  onCambio,
}: {
  categorias: Categoria[];
  onCambio: () => void;
}) {
  const [filtro, setFiltro] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [items, setItems] = useState<ServicioCatalogo[] | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  // Alta
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [genero, setGenero] = useState<GeneroServicio>("unisex");

  // Edición inline
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_DEFAULT);

  const [editando, setEditando] = useState<string | null>(null);
  const [eNombre, setENombre] = useState("");
  const [eCategoria, setECategoria] = useState("");
  const [eDuracion, setEDuracion] = useState(60);
  const [eGenero, setEGenero] = useState<GeneroServicio>("unisex");

  const cargar = useCallback(() => {
    setItems(null);
    listServicios(filtro || undefined)
      .then(setItems)
      .catch(() => setItems([]));
  }, [filtro]);

  useEffect(cargar, [cargar]);

  // Elegir por defecto la categoría filtrada, o la primera de la lista
  useEffect(() => {
    setCategoria((prev) => prev || filtro || categorias[0]?.slug || "");
  }, [filtro, categorias]);

  const nombreCategoria = (slug: string) =>
    categorias.find((c) => c.slug === slug)?.nombre ?? slug;

  const visibles = useMemo(() => {
    if (!items) return null;
    const q = busqueda.trim().toLowerCase();
    return q ? items.filter((s) => s.nombre.toLowerCase().includes(q)) : items;
  }, [items, busqueda]);

  // Cambiar filtro o búsqueda siempre vuelve a la primera página.
  useEffect(() => setPage(1), [filtro, busqueda]);

  const paginas = Math.max(1, Math.ceil((visibles?.length ?? 0) / pageSize));
  useEffect(() => {
    if (page > paginas) setPage(paginas);
  }, [page, paginas]);

  const serviciosPagina = useMemo(
    () => (visibles ? visibles.slice((page - 1) * pageSize, page * pageSize) : []),
    [visibles, page, pageSize],
  );

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("Escribí el nombre del servicio.");
      return;
    }
    if (!categoria) {
      setError("Elegí una categoría.");
      return;
    }
    if (!Number.isFinite(duracion) || duracion <= 0) {
      setError("La duración tiene que ser mayor a 0.");
      return;
    }
    setTrabajando(true);
    try {
      await crearServicio({
        nombre,
        categoria,
        duracionEstimadaMin: duracion,
        genero,
      });
      setNombre("");
      cargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear.");
    } finally {
      setTrabajando(false);
    }
  }

  function empezarEdicion(s: ServicioCatalogo) {
    setEditando(s.id);
    setENombre(s.nombre);
    setECategoria(s.categoria);
    setEDuracion(s.duracionEstimadaMin);
    setEGenero(s.genero ?? "unisex");
    setError("");
  }

  async function guardarEdicion(id: string) {
    if (!eNombre.trim() || !eCategoria || eDuracion <= 0) {
      setError("Revisá nombre, categoría y duración.");
      return;
    }
    setTrabajando(true);
    try {
      await actualizarServicio(id, {
        nombre: eNombre.trim(),
        categoria: eCategoria,
        duracionEstimadaMin: eDuracion,
        genero: eGenero,
      });
      setEditando(null);
      cargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setTrabajando(false);
    }
  }

  async function borrar(s: ServicioCatalogo) {
    if (
      !confirm(
        `¿Eliminar "${s.nombre}" del catálogo? Los profesionales que ya lo tienen cargado no se ven afectados.`,
      )
    ) {
      return;
    }
    setTrabajando(true);
    try {
      await eliminarServicio(s.id);
      cargar();
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">
          Servicios del catálogo{" "}
          {visibles && (
            <span className="font-normal text-slate-400">
              ({visibles.length})
            </span>
          )}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <select
            className={input + " w-48"}
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.emoji} {c.nombre}
              </option>
            ))}
          </select>
          <input
            className={input + " w-48"}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar servicio…"
          />
        </div>
      </div>

      <form
        onSubmit={crear}
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-slate-500">Nombre</label>
          <input
            className={input}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Manicuría rusa"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Categoría</label>
          <select
            className={input}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">
            Duración (min)
          </label>
          <input
            type="number"
            min={5}
            step={5}
            className={input}
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">Género</label>
            <select
              className={input}
              value={genero}
              onChange={(e) => setGenero(e.target.value as GeneroServicio)}
            >
              {GENEROS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={trabajando || categorias.length === 0}
            className={btnPrimary}
          >
            <Plus size={16} />
          </button>
        </div>
      </form>

      {visibles === null ? (
        <p className="text-sm text-slate-400">Cargando servicios…</p>
      ) : visibles.length === 0 ? (
        <p className="text-sm text-slate-400">
          No hay servicios para este filtro.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {serviciosPagina.map((s) => {
            const enEdicion = editando === s.id;
            return (
              <div
                key={s.id}
                className="flex flex-wrap items-center gap-2 py-2 text-sm"
              >
                {enEdicion ? (
                  <>
                    <input
                      className={input + " w-56"}
                      value={eNombre}
                      onChange={(e) => setENombre(e.target.value)}
                    />
                    <select
                      className={input + " w-40"}
                      value={eCategoria}
                      onChange={(e) => setECategoria(e.target.value)}
                    >
                      {categorias.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      className={input + " w-24"}
                      value={eDuracion}
                      onChange={(e) => setEDuracion(Number(e.target.value))}
                    />
                    <select
                      className={input + " w-32"}
                      value={eGenero}
                      onChange={(e) =>
                        setEGenero(e.target.value as GeneroServicio)
                      }
                    >
                      {GENEROS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => guardarEdicion(s.id)}
                      disabled={trabajando}
                      className={btnIcon}
                      title="Guardar"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditando(null)}
                      className={btnIcon}
                      title="Cancelar"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-56 flex-1 font-medium">
                      {s.nombre}
                    </span>
                    <span className="w-40 truncate text-xs text-slate-500">
                      {nombreCategoria(s.categoria)}
                    </span>
                    <span className="w-20 text-right text-xs tabular-nums text-slate-500">
                      {s.duracionEstimadaMin} min
                    </span>
                    <span className="w-24 text-xs text-slate-400">
                      {s.genero ?? "unisex"}
                    </span>
                    <button
                      onClick={() => empezarEdicion(s)}
                      className={btnIcon}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => borrar(s)}
                      disabled={trabajando}
                      className={btnIcon + " hover:bg-red-50 hover:text-red-600"}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {visibles && visibles.length > 0 && (
        <div className="-mx-5 -mb-5 mt-3 overflow-hidden rounded-b-xl">
          <Pagination
            total={visibles.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/* ─── Página ─── */

export default function CatalogoPage() {
  const [categorias, setCategorias] = useState<Categoria[] | null>(null);
  const [conteos, setConteos] = useState<Record<string, number>>({});

  const cargar = useCallback(() => {
    listCategorias().then(setCategorias).catch(() => setCategorias([]));
    contarServiciosPorCategoria().then(setConteos).catch(() => setConteos({}));
  }, []);

  useEffect(cargar, [cargar]);

  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Categorías y servicios base que los profesionales eligen para armar su lista de precios."
      />
      <div className="space-y-4 p-6">
        <SeedCard vacio={categorias?.length === 0} onListo={cargar} />

        {categorias === null ? (
          <p className="text-sm text-slate-400">Cargando catálogo…</p>
        ) : (
          <>
            <CategoriasCard
              categorias={categorias}
              conteos={conteos}
              onCambio={cargar}
            />
            <ServiciosCard categorias={categorias} onCambio={cargar} />
          </>
        )}
      </div>
    </>
  );
}
