"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

/**
 * Mostrado cuando el servidor no encontró orgId en el JWT.
 * Caso típico: usuario regresa con sesión sin org activa.
 *
 * Llama setActive con la primera membresía y recarga.
 * El reload hace un GET completo → Clerk middleware ejecuta el handshake
 * → auth() en el servidor ve el orgId correctamente.
 *
 * useRef evita que el efecto se dispare más de una vez.
 */
export function OrgGuard() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const hasActed = useRef(false);

  useEffect(() => {
    if (!isLoaded || userMemberships.isLoading) return;
    if (hasActed.current) return;
    hasActed.current = true;

    const memberships = userMemberships.data ?? [];

    if (memberships.length === 0) {
      window.location.href = "/onboarding";
      return;
    }

    setActive({ organization: memberships[0]!.organization.id })
      .then(() => window.location.reload())
      .catch(() => { window.location.href = "/onboarding"; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userMemberships.isLoading]);

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-gray-400">Cargando tu escuela…</p>
    </div>
  );
}
