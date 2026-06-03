"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole, SubscriptionPlan } from "@prisma/client";
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
  Calendar,
  Shield,
  AlertTriangle,
  Beaker,
  Receipt,
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { label: "Inicio",       href: "/dashboard",                          icon: LayoutDashboard, roles: ["ADMIN", "RECEPTIONIST", "INSTRUCTOR"] },
  { label: "Alumnos",      href: "/dashboard/alumnos",                  icon: Users,           roles: ["ADMIN", "RECEPTIONIST"] },
  { label: "Instructores", href: "/dashboard/instructores",             icon: UserCheck,       roles: ["ADMIN"] },
  { label: "Grupos",       href: "/dashboard/grupos",                   icon: BookOpen,        roles: ["ADMIN", "RECEPTIONIST"] },
  { label: "Asistencia",   href: "/dashboard/asistencia",               icon: ClipboardList,   roles: ["ADMIN", "RECEPTIONIST", "INSTRUCTOR"] },
  { label: "Eventos",      href: "/dashboard/eventos",                  icon: Calendar,        roles: ["ADMIN"] },
  { label: "Pagos",        href: "/dashboard/pagos",                    icon: CreditCard,      roles: ["ADMIN", "RECEPTIONIST"] },
  { label: "Reportes",     href: "/dashboard/reportes",                 icon: BarChart2,       roles: ["ADMIN"] },
  { label: "Comunicados",  href: "/dashboard/comunicados",              icon: Bell,            roles: ["ADMIN", "RECEPTIONIST"] },
];

const ALL_CONFIG_ITEMS = [
  { label: "Equipo",        href: "/dashboard/configuracion/equipo",      icon: Users,     roles: ["ADMIN"] },
  { label: "Disciplinas",   href: "/dashboard/configuracion/disciplinas", icon: Tag,       roles: ["ADMIN"] },
  { label: "Mi escuela",    href: "/dashboard/configuracion/escuela",     icon: Building2, roles: ["ADMIN"] },
  { label: "Auditoría",     href: "/dashboard/configuracion/auditoria",   icon: Shield,    roles: ["ADMIN", "RECEPTIONIST"] },
  { label: "Suscripción",   href: "/dashboard/billing",                   icon: Receipt,   roles: ["ADMIN"] },
];

const SUPER_ADMIN_ITEMS = [
  { label: "Errores del Sistema", href: "/dashboard/super-admin/errores", icon: AlertTriangle, roles: ["SUPER_ADMIN"] },
  { label: "Pruebas Sentry & Pino", href: "/dashboard/test-logging", icon: Beaker, roles: ["SUPER_ADMIN"] },
];

interface SidebarProps {
  userRole?: UserRole;
  plan?: SubscriptionPlan;
}

export function Sidebar({ userRole = "RECEPTIONIST", plan }: SidebarProps) {
  const pathname = usePathname();

  const NAV_ITEMS    = ALL_NAV_ITEMS.filter(item => item.roles.includes(userRole));
  const CONFIG_ITEMS = ALL_CONFIG_ITEMS.filter(item => item.roles.includes(userRole));
  const ADMIN_ITEMS = SUPER_ADMIN_ITEMS.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-full w-full flex-col border-r border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-house md:w-60">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 dark:border-[rgba(255,255,255,0.10)] px-6">
        <span className="text-xl font-semibold text-sb-green dark:text-sb-light">Klassi</span>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sb-light/60 dark:bg-sb-depth text-sb-green dark:text-sb-light"
                  : "text-gray-600 dark:text-sb-light/70 hover:bg-gray-100 dark:hover:bg-sb-uplift hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-sb-accent dark:text-sb-light" : "text-gray-400 dark:text-sb-light/50")} />
              {label}
            </Link>
          );
        })}

        {/* Configuración */}
        <div className="pt-4">
          <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-sb-light/50">
            Configuración
          </p>
          {CONFIG_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sb-light/60 dark:bg-sb-depth text-sb-green dark:text-sb-light"
                    : "text-gray-600 dark:text-sb-light/70 hover:bg-gray-100 dark:hover:bg-sb-uplift hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-sb-accent dark:text-sb-light" : "text-gray-400 dark:text-sb-light/50")} />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Enterprise */}
        {plan === "ENTERPRISE" && userRole === "ADMIN" && (
          <div className="pt-4">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-sb-light/50">
              Enterprise
            </p>
            {(() => {
              const href   = "/dashboard/enterprise";
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sb-light/60 dark:bg-sb-depth text-sb-green dark:text-sb-light"
                      : "text-gray-600 dark:text-sb-light/70 hover:bg-gray-100 dark:hover:bg-sb-uplift hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Building2 className={cn("h-4 w-4 flex-shrink-0", active ? "text-sb-accent dark:text-sb-light" : "text-gray-400 dark:text-sb-light/50")} />
                  Mis escuelas
                </Link>
              );
            })()}
          </div>
        )}

        {/* Super Admin */}
        {ADMIN_ITEMS.length > 0 && (
          <div className="pt-4">
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-sb-light/50">
              Super Admin
            </p>
            {ADMIN_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sb-light/60 dark:bg-sb-depth text-sb-green dark:text-sb-light"
                      : "text-gray-600 dark:text-sb-light/70 hover:bg-gray-100 dark:hover:bg-sb-uplift hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", active ? "text-sb-accent dark:text-sb-light" : "text-gray-400 dark:text-sb-light/50")} />
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
