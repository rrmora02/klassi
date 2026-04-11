"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Mostrado cuando el servidor no encontró orgId en el JWT.
 *
 * Estrategia:
 *  1. Si el usuario tiene membresías, activar la primera org y recargar.
 *     sessionStorage["ogr-retried"] evita el loop: si el reload tampoco funciona,
 *     en la segunda vez se redirige a /onboarding para que el usuario cree una org nueva.
 *  2. Si no tiene ninguna membresía → /onboarding.
 */
export function OrgGuard() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || userMemberships.isLoading) return;

    const memberships = userMemberships.data ?? [];

    if (memberships.length === 0) {
      window.location.href = "/onboarding";
      return;
    }

    // Ya intentamos una vez — si volvemos a estar aquí, ir a onboarding
    if (sessionStorage.getItem("org-guard-retried")) {
      sessionStorage.removeItem("org-guard-retried");
      window.location.href = "/onboarding";
      return;
    }

    // Primer intento: activar org y recargar
    sessionStorage.setItem("org-guard-retried", "1");
    setActive({ organization: memberships[0]!.organization.id })
      .then(() => new Promise<void>((r) => setTimeout(r, 500)))
      .then(() => window.location.reload())
      .catch(() => {
        sessionStorage.removeItem("org-guard-retried");
        window.location.href = "/onboarding";
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userMemberships.isLoading]);   // solo correr cuando carga — no en cada cambio de data

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-400">Cargando tu escuela…</div>
    </div>
  );
}
