"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  ClipboardList,
  CreditCard,
  BarChart2,
  Bell,
  Tag,
  Building2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Inicio",       href: "/dashboard",                          icon: LayoutDashboard },
  { label: "Alumnos",      href: "/dashboard/alumnos",                  icon: Users },
  { label: "Instructores", href: "/dashboard/instructores",             icon: UserCheck },
  { label: "Grupos",       href: "/dashboard/grupos",                   icon: BookOpen },
  { label: "Asistencia",   href: "/dashboard/asistencia",               icon: ClipboardList },
  { label: "Pagos",        href: "/dashboard/pagos",                    icon: CreditCard },
  { label: "Reportes",     href: "/dashboard/reportes",                 icon: BarChart2 },
  { label: "Comunicados",  href: "/dashboard/comunicados",              icon: Bell },
] as const;

const CONFIG_ITEMS = [
  { label: "Equipo",       href: "/dashboard/configuracion/equipo",      icon: Users },
  { label: "Disciplinas",  href: "/dashboard/configuracion/disciplinas", icon: Tag },
  { label: "Mi escuela",   href: "/dashboard/configuracion/escuela",     icon: Building2 },
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
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-50 text-blue-900"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-blue-700" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}

        {/* Configuración */}
        <div className="pt-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Configuración
          </p>
          {CONFIG_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-900"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-blue-700" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
