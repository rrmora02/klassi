"use client";

import { OrganizationList } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

/**
 * Página de selección de organización — ruta catch-all para que los
 * sub-paths internos de Clerk (create, etc.) no lancen errores.
 *
 * Si el estado cliente de Clerk ya tiene orgId (setActive completó),
 * redirigimos directamente al dashboard sin necesidad del handshake JWT.
 */
export default function SelectOrgPage() {
  const { isLoaded, orgId } = useAuth();

  useEffect(() => {
    if (isLoaded && orgId) {
      window.location.href = "/dashboard";
    }
  }, [isLoaded, orgId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona tu escuela para continuar
          </p>
        </div>

        <OrganizationList
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
          hideSlug
          appearance={{
            elements: {
              rootBox:           "w-full",
              card:              "rounded-2xl border border-gray-200 shadow-none w-full",
              formButtonPrimary: "bg-blue-900 hover:bg-blue-800 text-sm normal-case",
              footer:            "hidden",
            },
          }}
        />
      </div>
    </main>
  );
}
