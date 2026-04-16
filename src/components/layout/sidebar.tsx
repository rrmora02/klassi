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
    <aside
      className="flex flex-col"
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          borderBottom: "1px solid var(--sidebar-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(99,102,241,0.45)",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>K</span>
          </div>
          <span
            style={{
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Klassi
          </span>
        </div>
      </div>

      {/* Nav principal */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                active
                  ? "text-white"
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              )}
              style={
                active
                  ? { background: "var(--sidebar-active-bg)" }
                  : undefined
              }
            >
              <Icon
                className="flex-shrink-0"
                size={15}
                style={{
                  color: active ? "var(--sidebar-icon-active)" : "var(--sidebar-icon)",
                  transition: "color 0.15s",
                }}
              />
              {label}
            </Link>
          );
        })}

        {/* Configuración */}
        <div style={{ marginTop: 16 }}>
          <p
            style={{
              padding: "0 12px 8px",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              color: "var(--sidebar-section-label)",
            }}
          >
            Configuración
          </p>
          {CONFIG_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                  active
                    ? "text-white"
                    : "text-white/60 hover:text-white/90 hover:bg-white/5"
                )}
                style={
                  active
                    ? { background: "var(--sidebar-active-bg)" }
                    : undefined
                }
              >
                <Icon
                  className="flex-shrink-0"
                  size={15}
                  style={{
                    color: active ? "var(--sidebar-icon-active)" : "var(--sidebar-icon)",
                    transition: "color 0.15s",
                  }}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
