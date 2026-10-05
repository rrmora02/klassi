"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bell, CreditCard, User, ClipboardList } from "lucide-react";
import { api } from "@/lib/trpc";

const HOME    = { href: "/portal",                label: "Inicio",         icon: Home };
const ASIST   = { href: "/portal/asistencia",     label: "Asistencia",     icon: ClipboardList };
const NOTIF   = { href: "/portal/notificaciones", label: "Notificaciones", icon: Bell };
const PAGOS   = { href: "/portal/pagos",          label: "Pagos",          icon: CreditCard };
const CUENTA  = { href: "/portal/cuenta",         label: "Cuenta",         icon: User };

export function PortalTabs() {
  const pathname = usePathname();
  const { data: unread } = api.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const { data: viewer } = api.portal.viewer.useQuery();

  // Pestañas según el rol: el instructor ve "Asistencia"; el tutor, "Pagos".
  const TABS = [
    HOME,
    ...(viewer?.isInstructor ? [ASIST] : []),
    NOTIF,
    ...(viewer?.isParent || !viewer?.isInstructor ? [PAGOS] : []),
    CUENTA,
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
      background: "var(--color-background-primary)",
      borderTop: "0.5px solid var(--color-border-tertiary)",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      <div style={{ display: "flex", maxWidth: 520, margin: "0 auto" }}>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={active ? "portal-accent-text" : undefined} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              padding: "10px 0 8px", textDecoration: "none",
              ...(active ? {} : { color: "var(--color-text-tertiary)" }),
              fontWeight: active ? 600 : 400,
            }}>
              <span style={{ position: "relative" }}>
                <Icon size={20} />
                {href === "/portal/notificaciones" && (unread ?? 0) > 0 && (
                  <span
                    aria-label={`${unread} sin leer`}
                    style={{
                      position: "absolute", top: -6, right: -10,
                      background: "var(--danger-solid)", color: "var(--danger-solid-fg)", borderRadius: 10,
                      fontSize: 12, fontWeight: 700, minWidth: 18, textAlign: "center", padding: "0 5px", lineHeight: "18px",
                    }}
                  >
                    {unread! > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
