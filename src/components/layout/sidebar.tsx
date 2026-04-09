"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Inicio",        href: "/dashboard",                    icon: "◻" },
  { label: "Alumnos",       href: "/dashboard/alumnos",            icon: "◻" },
  { label: "Instructores",  href: "/dashboard/instructores",       icon: "◻" },
  { label: "Grupos",        href: "/dashboard/grupos",             icon: "◻" },
  { label: "Asistencia",    href: "/dashboard/asistencia",         icon: "◻" },
  { label: "Pagos",         href: "/dashboard/pagos",              icon: "◻" },
  { label: "Reportes",      href: "/dashboard/reportes",           icon: "◻" },
  { label: "Comunicados",   href: "/dashboard/comunicados",        icon: "◻" },
] as const;

const CONFIG_ITEMS = [
  { label: "Disciplinas",   href: "/dashboard/configuracion/disciplinas", icon: "◻" },
  { label: "Mi escuela",    href: "/dashboard/configuracion/escuela",     icon: "◻" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-semibold text-blue-900">Klassi</span>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-blue-50 text-blue-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <span className="text-xs opacity-50">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {/* Configuración */}
        <div className="pt-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Configuración
          </p>
          {CONFIG_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <span className="text-xs opacity-50">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
