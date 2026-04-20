"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { Send, Trash2 } from "lucide-react";

interface Props {
  id:     string;
  sentAt: Date | null;
  title:  string;
}

export function AnnouncementActions({ id, sentAt, title }: Props) {
  const router   = useRouter();
  const send     = api.announcements.send.useMutation();
  const destroy  = api.announcements.delete.useMutation();
  const [confirm, setConfirm] = useState(false);

  const handleSend = async () => {
    if (!window.confirm(`¿Enviar el comunicado "${title}"?`)) return;
    try {
      await send.mutateAsync({ id });
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Error al enviar");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return;
    await destroy.mutateAsync({ id });
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
      {!sentAt && (
        <button
          onClick={handleSend}
          disabled={send.isLoading}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#1e3a5f", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}
        >
          <Send size={12} /> {send.isLoading ? "Enviando..." : "Enviar"}
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={destroy.isLoading}
        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
