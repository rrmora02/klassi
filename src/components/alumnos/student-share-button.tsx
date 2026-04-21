"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { Share2, Copy, Check, X } from "lucide-react";

interface Props {
  studentId: string;
  existingToken?: string | null;
}

export function StudentShareButton({ studentId, existingToken }: Props) {
  const [open, setOpen]       = useState(false);
  const [token, setToken]     = useState<string | null>(existingToken ?? null);
  const [copied, setCopied]   = useState(false);

  const generate = api.students.generateShareLink.useMutation({
    onSuccess: (data) => setToken(data.shareToken),
  });

  const link = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/alumno/${token}`
    : null;

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                  Compartir historial con el tutor
                </h2>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
                  Genera un enlace seguro que el tutor puede ver sin iniciar sesión.
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
            {!token ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
                  Aún no se ha generado un enlace para este alumno.
                </p>
                <button
                  onClick={() => generate.mutate({ id: studentId })}
                  disabled={generate.isLoading}
                  style={{
                    padding: "10px 24px", borderRadius: 8, border: "none",
                    background: "#00754A", color: "#fff", fontSize: 14, fontWeight: 500,
                    cursor: generate.isLoading ? "not-allowed" : "pointer",
                    opacity: generate.isLoading ? 0.7 : 1,
                  }}
                >
                  {generate.isLoading ? "Generando..." : "Generar enlace"}
                </button>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>
                  Enlace de acceso
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    readOnly
                    value={link ?? ""}
                    style={{
                      flex: 1, padding: "9px 12px", borderRadius: 8, fontSize: 12,
                      border: "0.5px solid var(--color-border-secondary)",
                      background: "var(--color-background-secondary)",
                      color: "var(--color-text-secondary)", outline: "none",
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "9px 14px", borderRadius: 8, border: "none",
                      background: copied ? "#00754A" : "var(--color-background-secondary)",
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
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 10 }}>
                  Cualquier persona con este enlace puede ver el historial del alumno. No comparte datos sensibles ni permite editar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
