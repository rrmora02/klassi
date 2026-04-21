"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Share2, Copy, Check, X } from "lucide-react";

interface Props {
  studentId: string;
}

export function StudentShareButton({ studentId }: Props) {
  const [open, setOpen]     = useState(false);
  const [link, setLink]     = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = api.students.generateShareLink.useMutation({
    onSuccess: (data) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setLink(`${origin}/alumno/${data.shareToken}`);
    },
  });

  const handleOpen = () => {
    setOpen(true);
    if (!link) generate.mutate({ id: studentId });
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          border: "0.5px solid var(--color-border-secondary)",
          background: "transparent", color: "var(--color-text-secondary)",
          cursor: "pointer",
        }}
      >
        <Share2 size={14} />
        Compartir historial
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
        }}>
          <div style={{
            background: "var(--color-background-primary)", width: 480, borderRadius: 14,
            padding: 28, boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                  Compartir historial con el tutor
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Enlace de solo lectura — el tutor no necesita crear cuenta.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido */}
            {generate.isLoading || !link ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
                Generando enlace...
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
                  Enlace de acceso
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    readOnly
                    value={link}
                    onClick={e => (e.target as HTMLInputElement).select()}
                    className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.15)] bg-gray-50 dark:bg-sb-house text-gray-500 dark:text-sb-light/60 px-3 py-2 text-xs outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "8px 14px", borderRadius: 8, flexShrink: 0,
                      background: copied ? "#00754A" : "transparent",
                      color: copied ? "#fff" : "var(--color-text-secondary)",
                      border: "0.5px solid var(--color-border-secondary)",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                      fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
                  Cualquier persona con este enlace puede ver el historial del alumno. No permite editar ni comparte notas internas.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
