"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useState } from "react";

/**
 * Página de selección de organización.
 *
 * Usa useOrganizationList + setActive en lugar de <OrganizationList> porque
 * el componente pre-built hace navegación client-side después de seleccionar
 * la org, lo que provoca un loop: el middleware aún no ve el orgId actualizado
 * en el JWT y redirige de vuelta a /select-org.
 *
 * Con setActive + window.location.href forzamos un request completo al servidor,
 * garantizando que el middleware vea el JWT actualizado.
 */
export default function SelectOrgPage() {
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(orgId: string) {
    if (!setActive) return;
    setActivatingId(orgId);
    setError(null);

    setActive({ organization: orgId })
      .then(() => {
        // Full navigation — ensures the middleware sees the updated JWT cookie
        window.location.href = "/dashboard";
      })
      .catch(() => {
        setActivatingId(null);
        setError("No se pudo activar la escuela. Intenta de nuevo.");
      });
  }

  const memberships = userMemberships?.data ?? [];
  const isLoading = !isLoaded || userMemberships?.isLoading;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex w-full max-w-md flex-col items-center gap-6 px-4">
        <div className="text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona tu escuela para continuar
          </p>
        </div>

        <div className="w-full rounded-2xl border border-gray-200 bg-white p-6">
          {isLoading ? (
            <p className="text-center text-sm text-gray-400">
              Cargando escuelas…
            </p>
          ) : memberships.length === 0 ? (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                No perteneces a ninguna escuela.
              </p>
              <a
                href="/onboarding"
                className="mt-3 inline-block rounded-lg bg-blue-900 px-4 py-2 text-sm text-white hover:bg-blue-800"
              >
                Crear una escuela
              </a>
            </div>
          ) : (
            <ul className="space-y-2">
              {memberships.map((mem) => {
                const org = mem.organization;
                const isActivating = activatingId === org.id;

                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      disabled={activatingId !== null}
                      onClick={() => handleSelect(org.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {org.imageUrl ? (
                        <img
                          src={org.imageUrl}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-900">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      )}

                      <span className="flex-1 truncate text-sm font-medium text-gray-800">
                        {org.name}
                      </span>

                      {isActivating && (
                        <span className="text-xs text-gray-400">
                          Entrando…
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </main>
  );
}
