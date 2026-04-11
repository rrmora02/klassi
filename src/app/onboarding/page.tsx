"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useState } from "react";
import { getSessionOrgId } from "./actions";

export default function OnboardingPage() {
  const { createOrganization, setActive, isLoaded } = useOrganizationList();
  const [name, setName]       = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const org = await createOrganization({ name: name.trim() });
      await setActive({ organization: org.id });

      // Hacer polling al servidor hasta que confirme que el JWT cookie
      // llegó con orgId. Sin esto, window.location.href llega antes que
      // el cookie y el servidor ve orgId=null.
      let confirmed = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 300)); // 300ms × 20 = 6s máx
        const serverOrgId = await getSessionOrgId();
        if (serverOrgId) { confirmed = true; break; }
      }

      if (confirmed) {
        window.location.href = "/dashboard";
      } else {
        setError("El servidor tardó demasiado en actualizar la sesión. Intenta recargar la página.");
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Error al crear la escuela");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8">
        <div className="mb-8 text-center">
          <span className="text-2xl font-semibold text-blue-900">Klassi</span>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Crea tu escuela</h1>
          <p className="mt-1 text-sm text-gray-500">
            Esto es lo único que necesitas para empezar. Tienes 14 días gratis.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Nombre de tu escuela
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Academia de Ballet Monterrey"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Puedes cambiarlo después desde configuración.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg bg-blue-900 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? "Creando tu escuela..." : "Crear escuela y entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras
        </p>
      </div>
    </main>
  );
}
