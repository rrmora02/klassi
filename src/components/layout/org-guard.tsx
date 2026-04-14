"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Guard client-side para el dashboard.
 *
 * Usa router.replace (soft navigation) en lugar de window.location.href
 * para preservar el estado en memoria de Clerk entre rutas. Con una
 * navegación hard (window.location.href), Clerk se reinicializa desde el
 * JWT cookie — que puede estar desactualizado después de setActive() —
 * provocando un loop. Con soft navigation el estado del cliente persiste.
 */
export function OrgGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId, orgId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) { router.replace("/sign-in"); return; }
    if (!orgId)  { router.replace("/select-org"); return; }
  }, [isLoaded, userId, orgId, router]);

  if (!isLoaded || !orgId) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Cargando tu escuela…</p>
      </div>
    );
  }

  return <>{children}</>;
}
