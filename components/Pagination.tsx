"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/** Opciones de filas por página que puede elegir el usuario. */
export const PAGE_SIZE_OPTIONS = [5, 10, 15] as const;
export const PAGE_SIZE_DEFAULT = 5;

type Props = {
  /** Cantidad total de ítems (ya filtrados). */
  total: number;
  /** Página actual (arranca en 1). */
  page: number;
  /** Ítems por página. */
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

/**
 * Controles de paginación client-side para las tablas del panel, con
 * selector de filas por página (5/10/15). No renderiza nada si todo
 * entra en una página del tamaño mínimo.
 */
export function Pagination({ total, page, pageSize, onPageChange, onPageSizeChange }: Props) {
  if (total <= Math.min(...PAGE_SIZE_OPTIONS)) return null;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  const btn =
    "rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 " +
    "disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          {desde}–{hasta} de {total}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          Filas:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-1.5 py-1 text-xs text-slate-700"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(1)} title="Primera página">
          <ChevronsLeft size={14} />
        </button>
        <button className={btn} disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Anterior">
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-xs text-slate-600">
          Página {page} de {pages}
        </span>
        <button className={btn} disabled={page >= pages} onClick={() => onPageChange(page + 1)} title="Siguiente">
          <ChevronRight size={14} />
        </button>
        <button className={btn} disabled={page >= pages} onClick={() => onPageChange(pages)} title="Última página">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
