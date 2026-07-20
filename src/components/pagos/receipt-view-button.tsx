"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Paperclip } from "lucide-react";

interface Props {
  kind: "payment" | "event";
  id:   string;
}

// El staff abre el comprobante adjuntado por el tutor (URL firmada de corta vida)
export function ReceiptViewButton({ kind, id }: Props) {
  const { toast } = useToast();
  const utils = api.useContext();
  const [loading, setLoading] = useState(false);

  async function handleView() {
    setLoading(true);
    try {
      const { url } = await utils.payments.getReceiptViewUrl.fetch({ kind, id });
      window.open(url, "_blank", "noopener");
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "No se pudo abrir el comprobante", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleView}
      disabled={loading}
      title="Ver comprobante adjuntado por el tutor"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "rgba(15,118,110,0.10)", color: "#0f766e",
        border: "none", borderRadius: 14, padding: "3px 10px",
        fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
      }}
    >
      <Paperclip size={11} />
      {loading ? "Abriendo…" : "Comprobante"}
    </button>
  );
}
