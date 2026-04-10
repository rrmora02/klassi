"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Verifica del lado del cliente si hay una org activa en la sesión de Clerk.
 * Si la encuentra, recarga la página para que el servidor pueda leerla del JWT.
 * Si no, redirige al onboarding.
 *
 * Se usa cuando el servidor no encontró orgId (típico race condition después de setActive).
 */
export function OrgGuard() {
  const { orgId, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (orgId) {
      // El cliente sí tiene la org — recargar para que el servidor vea el JWT actualizado
      window.location.reload();
    } else {
      // Realmente no hay org — ir a onboarding
      window.location.href = "/onboarding";
    }
  }, [isLoaded, orgId]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-400">Cargando tu escuela…</div>
    </div>
  );
}
