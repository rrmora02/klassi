"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Mostrado cuando el servidor no encontró orgId en el JWT (race condition post-setActive).
 *
 * Lógica:
 *  - Si el usuario tiene orgs pero ninguna está activa → activa la primera y recarga.
 *  - Si no tiene ninguna org → redirige a /onboarding para crearla.
 *
 * Esto rompe el loop: antes OrgGuard redirigía a /onboarding cuando orgId era null
 * aunque la org SÍ existía (solo no estaba activa en la sesión actual).
 */
export function OrgGuard() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || userMemberships.isLoading) return;

    const memberships = userMemberships.data ?? [];

    if (memberships.length > 0) {
      // Tiene orgs — activar la primera y recargar para que el servidor lea el JWT
      setActive({ organization: memberships[0]!.organization.id })
        .then(() => window.location.reload())
        .catch(() => {
          // Si falla setActive, al menos recargar para que el servidor intente de nuevo
          window.location.reload();
        });
    } else {
      // Genuinamente no tiene escuela — ir a crearla
      window.location.href = "/onboarding";
    }
  }, [isLoaded, userMemberships.isLoading, userMemberships.data, setActive]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-400">Cargando tu escuela…</div>
    </div>
  );
}
