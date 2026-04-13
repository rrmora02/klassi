"use client";

import { CreateOrganization } from "@clerk/nextjs";

/**
 * Onboarding: el usuario crea su escuela.
 *
 * Usamos <CreateOrganization> de Clerk en lugar de llamar manualmente a
 * createOrganization + setActive + navigate. La razón: setActive() solo
 * actualiza el estado en memoria de React; el cookie JWT que el servidor
 * lee (vía middleware) solo se actualiza durante el "handshake" de Clerk,
 * que ocurre cuando Clerk controla la navegación post-creación internamente.
 *
 * afterCreateOrganizationUrl hace que Clerk ejecute ese handshake antes de
 * redirigir, así que auth() en el servidor siempre verá el orgId.
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <h1 className="mt-2 text-xl font-semibold text-gray-900">Crea tu escuela</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras
          </p>
        </div>

        <CreateOrganization
          routing="hash"
          afterCreateOrganizationUrl="/dashboard"
          skipInvitationScreen
          appearance={{
            elements: {
              rootBox:               "w-full",
              card:                  "rounded-2xl border border-gray-200 shadow-none w-full p-8",
              headerTitle:           "text-xl font-semibold text-gray-900",
              headerSubtitle:        "text-sm text-gray-500",
              socialButtonsBlockButton: "hidden",
              dividerRow:            "hidden",
              formFieldLabel:        "text-sm font-medium text-gray-700",
              formFieldInput:        "rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
              formButtonPrimary:     "bg-blue-900 hover:bg-blue-800 text-sm normal-case rounded-lg",
              footerActionText:      "hidden",
              footerActionLink:      "hidden",
              footer:                "hidden",
            },
          }}
        />
      </div>
    </main>
  );
}
