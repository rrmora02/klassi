import { Lock } from "lucide-react";

/**
 * Reemplazo visual de un botón de "agregar" cuando la escuela activa está
 * en modo solo lectura (escuela hija bloqueada por el plan del padre).
 */
export function LockedButton({ label, reason }: { label: string; reason?: string | null }) {
  return (
    <span
      title={reason || "Escuela en modo solo lectura. Actualiza el plan a Enterprise desde tu escuela principal para agregar datos."}
      className="inline-flex items-center gap-2 rounded-lg bg-gray-200 dark:bg-sb-house px-4 py-2 text-sm font-medium text-gray-400 dark:text-gray-600 cursor-not-allowed whitespace-nowrap select-none"
    >
      <Lock className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
