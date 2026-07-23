"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import QRCode from "qrcode";
import { Smartphone, Copy, Check, RefreshCw } from "lucide-react";

// Acceso del instructor al portal (PWA): genera un enlace mágico para que
// entre desde su teléfono sin contraseña y pueda pasar lista de sus grupos.
// Una vez dentro, puede crear su contraseña en la pestaña "Cuenta".
// Solo se muestra para instructores que NO son administradores (el admin
// autoasignado ya entra por el panel).

interface Props {
  instructorId: string;
  enabled:      boolean; // false si aún no acepta su invitación
}

export function InstructorAccessCard({ instructorId, enabled }: Props) {
  const generate = api.instructors.generatePortalLink.useMutation();
  const [link, setLink]     = useState<{ url: string; qr: string; expiresInDays: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setCopied(false);
    try {
      const result = await generate.mutateAsync({ id: instructorId });
      const qr = await QRCode.toDataURL(result.url, { width: 220, margin: 1, color: { dark: "#1D3557" } });
      setLink({ url: result.url, qr, expiresInDays: result.expiresInDays });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el enlace");
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Smartphone size={15} style={{ color: "#1D3557" }} />
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--color-text-primary)" }}>Acceso al portal</h3>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 14px", lineHeight: 1.5 }}>
        Genera un enlace para que el instructor entre al portal desde su teléfono y pase lista de sus grupos. Al abrirlo puede crear su contraseña en la pestaña Cuenta.
      </p>

      {!enabled ? (
        <p style={{ fontSize: 12.5, color: "#b45309", margin: 0, lineHeight: 1.5 }}>
          El instructor aún no acepta su invitación por correo. En cuanto la acepte podrás generar su acceso al portal.
        </p>
      ) : (
        <>
          <button
            onClick={handleGenerate}
            disabled={generate.isLoading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#1D3557", color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
            }}
          >
            <RefreshCw size={12} />
            {generate.isLoading ? "Generando…" : link ? "Generar otro enlace" : "Generar enlace de acceso"}
          </button>

          {link && (
            <div style={{ marginTop: 14, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", background: "var(--color-background-secondary)", borderRadius: 10, padding: 14, maxWidth: "100%", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={link.qr} alt="QR de acceso al portal" width={110} height={110} style={{ borderRadius: 8, background: "#fff", padding: 4, flexShrink: 0 }} />
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
                  Escanéalo con el teléfono del instructor, o cópialo y envíaselo:
                </p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0 }}>
                  <code style={{ flex: 1, minWidth: 0, maxWidth: "100%", fontSize: 10.5, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, padding: "6px 8px", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-all", maxHeight: 60, overflowY: "auto" }}>
                    {link.url}
                  </code>
                  <button onClick={handleCopy} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, padding: "6px 10px", fontSize: 11, fontWeight: 600, color: copied ? "#0f766e" : "var(--color-text-secondary)", cursor: "pointer", flexShrink: 0 }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", margin: "6px 0 0" }}>
                  Un solo uso · expira en {link.expiresInDays} días · al abrirlo queda dentro del portal y puede crear su contraseña.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p style={{ fontSize: 12, color: "#dc2626", margin: "10px 0 0" }}>{error}</p>}
    </div>
  );
}
