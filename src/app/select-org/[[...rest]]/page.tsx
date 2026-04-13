"use client";

import { OrganizationList } from "@clerk/nextjs";

/**
 * Página de selección de organización.
 *
 * Usa <OrganizationList> de Clerk con routing="hash" para que el componente
 * maneje internamente el handshake de Clerk (que actualiza el JWT cookie con
 * el orgId) antes de redirigir al dashboard.
 *
 * Ruta catch-all ([[...rest]]) para que los sub-paths internos de Clerk
 * (ej. /select-org/create) funcionen sin errores de "route is not catch-all".
 * El middleware ya cubre /select-org(.*) así que ningún sub-path queda sin proteger.
 */
export default function SelectOrgPage() {
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
