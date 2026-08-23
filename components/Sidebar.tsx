"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  Scissors,
  Package,
  Map,
  Trophy,
  Percent,
  Tags,
  Image as ImageIcon,
  LogOut,
  Loader2,
} from "lucide-react";

/**
 * Indicador de navegación: useLinkStatus (dentro de un <Link>) expone
 * `pending` desde el instante del click hasta que la ruta destino termina
 * de cargar. Muestra un spinner en el ítem y un overlay a pantalla
 * completa para que la carga sea inconfundible.
 */
function NavPendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      <Loader2 size={14} className="ml-auto animate-spin text-brand-600" />
      <span className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
        <Loader2 size={36} className="animate-spin text-brand-600" />
        <span className="text-sm font-medium text-slate-600">Cargando…</span>
      </span>
    </>
  );
}

const items = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/mapa", label: "Mapa de calor", icon: Map },
  { href: "/competencias", label: "Competencias", icon: Trophy },
  { href: "/profesionales", label: "Profesionales", icon: Scissors },
  { href: "/proveedores", label: "Proveedores", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/comisiones", label: "Tarifas de servicio", icon: Percent },
  { href: "/catalogo", label: "Catálogo", icon: Tags },
  { href: "/banners", label: "Banners del home", icon: ImageIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-lg font-semibold">YOFI</div>
        <div className="text-xs text-slate-500">Panel admin</div>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm " +
                (active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-700 hover:bg-slate-100")
              }
            >
              <Icon size={16} />
              {it.label}
              <NavPendingSpinner />
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 text-xs">
        <div className="mb-2 truncate text-slate-500">{user?.email}</div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
        >
          <LogOut size={14} />
          Salir
        </button>
      </div>
    </aside>
  );
}
