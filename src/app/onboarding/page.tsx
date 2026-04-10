"use client";

import { CreateOrganization } from "@clerk/nextjs";

/**
 * Onboarding: el usuario crea su escuela (organización Clerk).
 * Usamos el componente oficial <CreateOrganization> para que Clerk maneje
 * internamente la actualización del JWT antes de redirigir — evita todos los
 * race conditions que ocurren al llamar createOrganization + setActive manualmente.
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      {/* Header encima del widget de Clerk */}
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <p className="mt-1 text-sm text-gray-500">
            Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras
          </p>
        </div>

        <CreateOrganization
          afterCreateOrganizationUrl="/dashboard"
          appearance={{
            elements: {
              rootBox:   "w-full",
              card:      "rounded-2xl border border-gray-200 shadow-none w-full",
              headerTitle:    "text-gray-900",
              headerSubtitle: "text-gray-500",
              formButtonPrimary:
                "bg-blue-900 hover:bg-blue-800 text-sm normal-case",
            },
          }}
        />
      </div>
    </main>
  );
}
