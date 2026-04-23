"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/trpc";
import { Toast } from "@/components/shared/toast";

export default function AceptarInvitacionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const token = searchParams.get("token");

  const getInvitation = api.team.getInvitationByToken.useQuery(
    { token: token || "" },
    { enabled: !!token, retry: false }
  );

  const acceptInvitation = api.team.acceptInvitation.useMutation();

  useEffect(() => {
    if (getInvitation.isSuccess) {
      setInvitation(getInvitation.data);
      setLoading(false);
    }
    if (getInvitation.isError) {
      setError((getInvitation.error as any)?.message || "Error al cargar la invitación");
      setLoading(false);
    }
  }, [getInvitation.isSuccess, getInvitation.isError, getInvitation.data, getInvitation.error]);

  const handleAccept = async () => {
    if (!userId || !isLoaded) {
      setError("Debes iniciar sesión para aceptar la invitación");
      return;
    }

    // Get user info from Clerk
    const user = await fetch("/api/auth/user").then(r => r.json());

    try {
      await acceptInvitation.mutateAsync({
        token: token || "",
        clerkId: userId,
        email: user.email,
        name: user.name || user.email
      });

      setToast({ message: "¡Invitación aceptada! Redirigiendo...", type: "success" });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setToast({ message: err.message || "Error al aceptar invitación", type: "error" });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sb-house dark:to-sb-depth px-4">
        <div className="bg-white dark:bg-sb-house rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-2">Token inválido</h1>
          <p className="text-gray-600 dark:text-gray-400">No se encontró un token de invitación válido.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sb-house dark:to-sb-depth">
        <div className="bg-white dark:bg-sb-house rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sb-house dark:to-sb-depth px-4">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="bg-white dark:bg-sb-house rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-sb-house dark:to-sb-depth px-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="bg-white dark:bg-sb-house rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Invitación recibida!</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Has sido invitado a <span className="font-semibold text-gray-900 dark:text-white">{invitation?.tenantName}</span>
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-sb-depth rounded-lg p-4 mb-6 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Correo</label>
            <p className="text-gray-900 dark:text-white">{invitation?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rol</label>
            <p className="text-gray-900 dark:text-white">
              {invitation?.role === "ADMIN" && "Administrador Regional"}
              {invitation?.role === "RECEPTIONIST" && "Recepcionista"}
              {invitation?.role === "INSTRUCTOR" && "Instructor"}
            </p>
          </div>
        </div>

        {!isLoaded ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : userId ? (
          <button
            onClick={handleAccept}
            disabled={acceptInvitation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {acceptInvitation.isPending ? "Aceptando..." : "Aceptar Invitación"}
          </button>
        ) : (
          <button
            onClick={() => router.push("/sign-in")}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
