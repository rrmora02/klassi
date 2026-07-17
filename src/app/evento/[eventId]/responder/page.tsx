"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader } from "lucide-react";

interface PageProps {
  params: { eventId: string };
}

export default function ResponderEventoPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("student");
  const token = searchParams.get("token");

  const [response, setResponse] = useState<"yes" | "no" | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const mutation = api.events.confirmAttendanceFromLink.useMutation();

  if (!paymentId || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sb-light/20 to-sb-house/20 p-4">
        <div className="max-w-md w-full rounded-lg border border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 p-6 text-center">
          <XCircle className="h-12 w-12 mx-auto text-red-600 dark:text-red-400 mb-3" />
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">
            Enlace inválido
          </h2>
          <p className="mt-2 text-sm text-red-800 dark:text-red-200">
            El enlace que utilizaste no es válido o ha expirado.
          </p>
          <p className="mt-4 text-xs text-red-700 dark:text-red-300">
            Por favor, solicita un nuevo enlace a tu escuela.
          </p>
        </div>
      </div>
    );
  }

  const handleResponse = async (willAttend: boolean) => {
    if (!paymentId) return;

    setLoading(true);
    try {
      await mutation.mutateAsync({
        eventPaymentId: paymentId,
        willAttend,
        token,
      });
      setSuccess(true);
      setResponse(willAttend ? "yes" : "no");
    } catch (error) {
      console.error("Error:", error);
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sb-light/20 to-sb-house/20 p-4">
        <div className="max-w-md w-full rounded-lg border border-green-300 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20 p-8 text-center">
          <CheckCircle className="h-16 w-16 mx-auto text-green-600 dark:text-green-400 mb-4" />
          <h2 className="text-2xl font-semibold text-green-900 dark:text-green-300">
            ¡Gracias!
          </h2>
          <p className="mt-4 text-green-800 dark:text-green-200">
            Tu respuesta fue registrada correctamente.
          </p>
          {response === "yes" && (
            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
              Confirmas que asistirás al evento. Recuerda realizar el pago antes
              de la fecha límite.
            </p>
          )}
          {response === "no" && (
            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
              Se ha registrado que no asistirás al evento.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sb-light/20 to-sb-house/20 p-4">
      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.10)] bg-white dark:bg-sb-uplift shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-sb-green to-sb-accent px-6 py-8 text-center">
            <h1 className="text-2xl font-bold text-white">🎉</h1>
            <h2 className="mt-2 text-xl font-semibold text-white">
              ¡Invitación a evento!
            </h2>
          </div>

          {/* Contenido */}
          <div className="p-6">
            <p className="text-center text-gray-700 dark:text-gray-200">
              ¿Asistirás al evento?
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleResponse(true)}
                disabled={loading}
                className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-green-400 px-4 py-3 text-center font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {loading && response === "yes" ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Sí, asistiré
                  </>
                )}
              </button>

              <button
                onClick={() => handleResponse(false)}
                disabled={loading}
                className="w-full rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 px-4 py-3 text-center font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {loading && response === "no" ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" />
                    No, no podré asistir
                  </>
                )}
              </button>
            </div>

            {/* Info adicional */}
            <div className="mt-6 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                ℹ️ Tu respuesta se registrará automáticamente. Si tienes dudas,
                contacta a tu escuela.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-sb-light/50">
          Powered by Klassi
        </p>
      </div>
    </div>
  );
}
