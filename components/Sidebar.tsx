"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Users,
  Scissors,
  Package,
  Map,
  Trophy,
  LogOut,
} from "lucide-react";

const items = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/mapa", label: "Mapa de calor", icon: Map },
  { href: "/competencias", label: "Competencias", icon: Trophy },
  { href: "/profesionales", label: "Profesionales", icon: Scissors },
  { href: "/proveedores", label: "Proveedores", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="text-lg font-semibold">Beautyapp</div>
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
