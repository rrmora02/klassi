"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/trpc";
import { Toast } from "@/components/shared/toast";

export default function CrearEscuelaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const createTenant = api.tenants.createTenant.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      setToast({ message: "Por favor ingresa el nombre de la escuela", type: "error" });
      return;
    }

    try {
      await createTenant.mutateAsync({ name: nombre });
      setToast({ message: "¡Escuela creada! Redirigiendo...", type: "success" });

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setToast({ message: err.message || "Error al crear escuela", type: "error" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sb-house dark:to-sb-depth px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white dark:bg-sb-house rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sb-green dark:text-white mb-2">Klassi</h1>
          <p className="text-gray-600 dark:text-gray-400">¡Bienvenido! Crea tu primera escuela</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre de la Escuela
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Colegio Gimboi"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-sb-depth text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-sb-green dark:focus:border-sb-green"
              disabled={createTenant.isPending}
            />
          </div>

          <button
            type="submit"
            disabled={createTenant.isPending}
            className="w-full bg-sb-green hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {createTenant.isPending ? "Creando..." : "Crear Escuela"}
          </button>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Serás administrador de esta escuela y podrás invitar a tus miembros.
        </p>
      </div>
    </div>
  );
}
