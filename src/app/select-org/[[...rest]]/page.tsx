"use client";

import { OrganizationList, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function SelectOrgPage() {
  const { orgId, getToken } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    // Cuando el usuario selecciona o crea una organización, Clerk actualiza
    // orgId en la memoria del cliente.
    if (orgId && !isNavigating) {
      setIsNavigating(true);
      
      // Aseguramos que la cookie de sesión esté sincronizada con el backend
      // ANTES de navegar al dashboard. Esto soluciona los problemas de Server
      // Components (RSC) recibiendo un estado stale de Clerk en navegación suave.
      const syncAndNavigate = async () => {
        try {
          await getToken({ skipCache: true });
        } catch (e) {
          console.error("Error renovando token", e);
        }
        // Navegación dura para forzar que Next.js lea la nueva cookie
        window.location.assign("/dashboard");
      };

      syncAndNavigate();
    }
  }, [orgId, isNavigating, getToken]);

  // Si estamos en proceso de navegación, mostrar un estado de carga en
  // lugar de la lista de organizaciones
  if (isNavigating) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-900" />
          <p className="text-sm font-medium text-gray-500">Preparando tu entorno...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-semibold text-violet-900">Klassi</span>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona tu escuela para continuar
          </p>
        </div>

        <OrganizationList
          hideSlug
          appearance={{
            elements: {
              rootBox:           "w-full",
              card:              "rounded-2xl border border-gray-200 shadow-none w-full",
              formButtonPrimary: "bg-violet-900 hover:bg-violet-800 text-sm normal-case",
              footer:            "hidden",
            },
          }}
        />
      </div>
    </main>
  );
}
