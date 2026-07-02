import { Lock } from "lucide-react";

/**
 * Aviso permanente cuando la escuela activa es una escuela hija bloqueada
 * (el plan de la escuela principal ya no incluye múltiples escuelas).
 * La información sigue disponible; las escrituras se rechazan en el servidor.
 */
export function ReadOnlyBanner({ reason }: { reason?: string | null }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
      <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-300" />
      <div>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Esta escuela está en modo solo lectura.
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
          {reason || "El plan de la escuela principal no incluye múltiples escuelas."}{" "}
          Puedes consultar toda la información, pero no agregar ni modificar datos.
          Para reactivarla, actualiza el plan a Enterprise desde tu escuela principal.
        </p>
      </div>
    </div>
  );
}
