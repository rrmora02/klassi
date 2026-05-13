"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import type { EventStatus } from "@prisma/client";

interface EventActionsProps {
  eventId: string;
  eventStatus: EventStatus;
}

export function EventActions({ eventId, eventStatus }: EventActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const markAsCompletedMutation = api.events.markAsCompleted.useMutation();

  const handleMarkAsCompleted = async () => {
    if (eventStatus === "COMPLETED") {
      toast({
        title: "Evento ya completado",
        description: "Este evento ya está marcado como completado",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await markAsCompletedMutation.mutateAsync({ id: eventId });
      toast({
        title: "¡Éxito!",
        description: "Evento marcado como completado correctamente",
        variant: "default",
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al marcar como completado";
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column", gap: 8 }}>
      {eventStatus !== "COMPLETED" && (
        <a
          href={`/dashboard/eventos/${eventId}/editar`}
          style={{ display: "block", width: "100%", borderRadius: 8, background: "#006241", color: "#fff", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 500, textDecoration: "none", border: "none", cursor: "pointer" }}
        >
          Editar evento
        </a>
      )}
      {eventStatus === "COMPLETED" && (
        <div style={{ display: "block", width: "100%", borderRadius: 8, background: "#e5e7eb", color: "#6b7280", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 500 }}>
          Evento completado - No se puede editar
        </div>
      )}

      {eventStatus !== "COMPLETED" && eventStatus !== "CANCELLED" && (
        <button
          onClick={handleMarkAsCompleted}
          disabled={isLoading}
          style={{ display: "block", width: "100%", borderRadius: 8, background: "#22c55e", color: "#fff", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: isLoading ? "wait" : "pointer", border: "none", opacity: isLoading ? 0.6 : 1 }}
        >
          {isLoading ? "Completando..." : "✓ Marcar como completado"}
        </button>
      )}

      {eventStatus !== "CANCELLED" && (
        <button style={{ display: "block", width: "100%", borderRadius: 8, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          Cancelar evento
        </button>
      )}
    </div>
  );
}
