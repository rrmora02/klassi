"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Send, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  id:     string;
  sentAt: Date | null;
  title:  string;
}

// Confirmación inline (dos clics) en lugar de window.confirm;
// el resultado se comunica con los toasts del sistema.
export function AnnouncementActions({ id, sentAt, title }: Props) {
  const router  = useRouter();
  const { toast } = useToast();
  const send    = api.announcements.send.useMutation();
  const destroy = api.announcements.delete.useMutation();
  const [confirming, setConfirming] = useState<"send" | "delete" | null>(null);

  // La confirmación pendiente se descarta sola tras unos segundos
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleSend = async () => {
    if (confirming !== "send") {
      setConfirming("send");
      return;
    }
    setConfirming(null);
    try {
      const result = await send.mutateAsync({ id });
      toast({
        title:       "Comunicado enviado",
        description: `"${title}" se envió a ${result.recipients} ${result.recipients === 1 ? "destinatario" : "destinatarios"}.`,
      });
      router.refresh();
    } catch (err: any) {
      toast({
        title:       "Error al enviar",
        description: err.message ?? "No se pudo enviar el comunicado",
        variant:     "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (confirming !== "delete") {
      setConfirming("delete");
      return;
    }
    setConfirming(null);
    try {
      await destroy.mutateAsync({ id });
      toast({ title: "Comunicado eliminado", description: `"${title}" fue eliminado.` });
      router.refresh();
    } catch (err: any) {
      toast({
        title:       "Error al eliminar",
        description: err.message ?? "No se pudo eliminar el comunicado",
        variant:     "destructive",
      });
    }
  };

  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
      {!sentAt && (
        <button
          onClick={handleSend}
          disabled={send.isLoading}
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer", fontWeight: 500,
            background: confirming === "send" ? "#00754A" : "none",
            color: confirming === "send" ? "#fff" : "#006241",
            border: "none", borderRadius: confirming === "send" ? 14 : 0,
            padding: confirming === "send" ? "4px 12px" : 0,
          }}
        >
          <Send size={12} />
          {send.isLoading ? "Enviando..." : confirming === "send" ? "¿Confirmar envío?" : "Enviar"}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={destroy.isLoading}
        style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 12, cursor: "pointer",
          background: confirming === "delete" ? "#b91c1c" : "none",
          color: confirming === "delete" ? "#fff" : "#b91c1c",
          border: "none", borderRadius: confirming === "delete" ? 14 : 0,
          padding: confirming === "delete" ? "4px 12px" : 0,
          fontWeight: confirming === "delete" ? 500 : 400,
        }}
      >
        <Trash2 size={12} />
        {confirming === "delete" ? "¿Eliminar?" : null}
      </button>
      {confirming && (
        <button
          onClick={() => setConfirming(null)}
          title="Cancelar"
          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 0 }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
