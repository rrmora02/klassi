"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { getSessionOrgId } from "@/app/onboarding/actions";

/**
 * Mostrado cuando el servidor no encontró orgId en el JWT.
 * Ocurre en usuarios que regresan y cuya sesión no tiene org activa.
 *
 * Estrategia:
 *  - useRef garantiza que la lógica corre UNA sola vez (evita doble-disparo
 *    por actualizaciones de userMemberships.isLoading con infinite:true).
 *  - Usa el mismo server action que onboarding: polling hasta que el servidor
 *    confirme el orgId en el JWT cookie antes de recargar.
 *  - Si no hay membresías → /onboarding.
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

    const orgId = memberships[0]!.organization.id;

    setActive({ organization: orgId })
      .then(async () => {
        // Esperar confirmación del servidor (mismo mecanismo que onboarding)
        for (let i = 0; i < 20; i++) {
          await new Promise((r) => setTimeout(r, 300));
          const serverOrgId = await getSessionOrgId();
          if (serverOrgId) break;
        }
        window.location.reload();
      })
      .catch(() => {
        window.location.href = "/onboarding";
      });
  // Solo disparar cuando termina de cargar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, userMemberships.isLoading]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-400">Cargando tu escuela…</div>
    </div>
  );
}
