"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader, CheckCircle } from "lucide-react";

interface AdminInstructorBannerProps {
  isAdmin: boolean;
  isAlreadyInstructor: boolean;
}

export function AdminInstructorBanner({ isAdmin, isAlreadyInstructor }: AdminInstructorBannerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const mutation = api.instructors.registerAdminAsInstructor.useMutation();

  if (!isAdmin || isAlreadyInstructor) {
    return null;
  }

  const handleRegister = async () => {
    setLoading(true);
    try {
      await mutation.mutateAsync();
      toast({
        title: "¡Éxito!",
        description: "Ya estás registrado como instructor. Ahora puedes enseñar clases.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "No pudimos registrarte como instructor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300">
            ¿Quieres enseñar clases?
          </h3>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            Como administrador, puedes registrarte como instructor para crear y dictar tus propias clases.
          </p>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              "Registrarme como instructor"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
