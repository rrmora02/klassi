"use client";

import { OrganizationList } from "@clerk/nextjs";

/**
 * Página de selección de organización.
 * Aparece cuando el usuario está autenticado pero no tiene una org activa
 * en su sesión (ej: primera visita, sesión expirada, etc.)
 *
 * <OrganizationList> maneja el handshake de Clerk internamente antes de
 * redirigir — igual que <CreateOrganization>. Esto garantiza que el
 * servidor vea el orgId en el siguiente request.
 */
export default function SelectOrgPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <p className="mt-1 text-sm text-gray-500">Selecciona tu escuela para continuar</p>
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
