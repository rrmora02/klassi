"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, CheckCircle2, Eye } from "lucide-react";
import { ActionButton } from "@/components/shared";

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
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {hasReceipt && (
        <>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--success-fg)]">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Comprobante enviado
          </span>
          <ActionButton variant="ghost" onClick={handleView}>
            <Eye className="h-4 w-4" aria-hidden="true" /> Ver
          </ActionButton>
        </>
      )}
      <ActionButton
        variant={hasReceipt ? "secondary" : "primary"}
        onClick={() => inputRef.current?.click()}
        loading={uploading}
      >
        {!uploading && <Paperclip className="h-4 w-4" aria-hidden="true" />}
        {uploading ? "Subiendo…" : hasReceipt ? "Reemplazar" : "Adjuntar comprobante"}
      </ActionButton>
    </div>
  );
}
