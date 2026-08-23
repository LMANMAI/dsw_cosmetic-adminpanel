import { Loader2 } from "lucide-react";

/**
 * Loading UI global del App Router: se muestra automáticamente mientras
 * Next.js carga/renderiza el segmento de la ruta destino al navegar.
 * Overlay a pantalla completa (cubre también el sidebar) para que el
 * cambio de sección sea inconfundible.
 */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
      <Loader2 size={36} className="animate-spin text-brand-600" />
      <span className="text-sm font-medium text-slate-600">Cargando…</span>
    </div>
  );
}
