"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Mostrado cuando el servidor no encontró orgId en el JWT.
 * Espera a que Clerk termine de cargar del lado del cliente:
 *  - Si hay org activa → la sesión ya tiene org pero el JWT aún no llegó al servidor;
 *    recargamos para que el servidor lo lea.
 *  - Si no hay org → redirigir a /onboarding para crearla.
 *
 * NO llamamos setActive aquí para evitar loops. La activación la hace
 * Clerk internamente cuando el usuario crea/selecciona la org en onboarding.
 */
export function OrgGuard() {
  const { orgId, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (orgId) {
      // JWT del cliente tiene org pero el servidor aún no lo vio → recargar una vez
      window.location.reload();
    } else {
      window.location.href = "/onboarding";
    }
  }, [isLoaded, orgId]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-400">Cargando tu escuela…</div>
    </div>
  );
}
