"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Check, Eye } from "lucide-react";

interface Props {
  kind: "payment" | "event";
  id:   string;
  hasReceipt: boolean;
  onUploaded: () => void;
}

// Adjuntar comprobante desde el teléfono: pide una URL firmada, sube el
// archivo directo a Supabase Storage (no pasa por el servidor) y confirma.
export function ReceiptUpload({ kind, id, hasReceipt, onUploaded }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const getUploadUrl = api.portal.getReceiptUploadUrl.useMutation();
  const attach       = api.portal.attachReceipt.useMutation();
  const utils        = api.useContext();

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const { uploadUrl, path } = await getUploadUrl.mutateAsync({
        kind, id,
        contentType: file.type,
        fileSize:    file.size,
      });

      const res = await fetch(uploadUrl, {
        method:  "PUT",
        headers: { "Content-Type": file.type },
        body:    file,
      });
      if (!res.ok) throw new Error("No se pudo subir el archivo. Intenta de nuevo.");

      await attach.mutateAsync({ kind, id, path });
      toast({
        title:       "Comprobante enviado",
        description: "Tu escuela lo revisará y marcará el pago como realizado.",
      });
      onUploaded();
    } catch (err: any) {
      toast({
        title:       "No se pudo adjuntar",
        description: err.message ?? "Intenta de nuevo",
        variant:     "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleView() {
    try {
      const { url } = await utils.portal.getReceiptViewUrl.fetch({ kind, id });
      window.open(url, "_blank", "noopener");
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "No se pudo abrir el comprobante", variant: "destructive" });
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {hasReceipt && (
        <>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#0f766e" }}>
            <Check size={12} /> Comprobante enviado
          </span>
          <button
            onClick={handleView}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", padding: 0, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            className="portal-accent-text"
          >
            <Eye size={12} /> Ver
          </button>
        </>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={hasReceipt ? "portal-accent-text" : undefined}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          background: hasReceipt ? "transparent" : "#1D3557",
          color: hasReceipt ? undefined : "#fff",
          border: hasReceipt ? "0.5px solid var(--color-border-secondary)" : "none",
          borderRadius: 16, padding: "5px 12px", fontSize: 11, fontWeight: 600,
          cursor: uploading ? "wait" : "pointer",
        }}
      >
        <Paperclip size={12} />
        {uploading ? "Subiendo…" : hasReceipt ? "Reemplazar" : "Adjuntar comprobante"}
      </button>
    </div>
  );
}
