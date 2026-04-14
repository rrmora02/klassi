"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Guard client-side para el dashboard.
 *
 * Lee el orgId desde el estado en memoria de Clerk (siempre actualizado
 * después de setActive), en lugar del JWT cookie httpOnly que el middleware
 * lee. Esto resuelve la race condition: después de setActive() el JWT aún
 * no refleja el nuevo orgId (el "handshake" de Clerk es asíncrono), pero
 * el estado cliente de Clerk sí lo tiene inmediatamente.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, orgId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) { window.location.href = "/sign-in"; return; }
    if (!orgId)  { window.location.href = "/select-org"; return; }
  }, [isLoaded, userId, orgId]);

  if (!isLoaded || !orgId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando tu escuela…</p>
      </div>
    );
  }

  return <>{children}</>;
}
