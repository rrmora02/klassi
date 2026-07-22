"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import QRCode from "qrcode";
import { Smartphone, Copy, Check, RefreshCw } from "lucide-react";

// Acceso de la familia al portal (PWA): genera enlaces mágicos por tutor.
// El tutor entra sin registro ni contraseña; el enlace expira y es
// regenerable. Nadie del staff conoce credenciales del tutor.

interface GeneratedLink {
  userId: string;
  url:    string;
  qr:     string; // data URL
  expiresInDays: number;
}

export function FamilyAccessCard({ studentId }: { studentId: string }) {
  const { data: parents, isLoading } = api.parentAccess.list.useQuery({ studentId });
  const utils = api.useContext();
  const generate = api.parentAccess.generateLink.useMutation({
    onSuccess: () => utils.parentAccess.list.invalidate({ studentId }),
  });

  const [link, setLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate(userId: string) {
    setError(null);
    setCopied(false);
    try {
      const result = await generate.mutateAsync({ studentId, userId });
      const qr = await QRCode.toDataURL(result.url, { width: 220, margin: 1, color: { dark: "#1D3557" } });
      setLink({ userId, url: result.url, qr, expiresInDays: result.expiresInDays });
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

  if (isLoading || !parents || parents.length === 0) return null;

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Smartphone size={15} style={{ color: "#1D3557" }} />
        <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Acceso de la familia</h2>
      </div>
      <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 14px" }}>
        Genera un enlace para que el tutor entre al portal desde su teléfono, sin contraseña. Expira en unos días y puedes generar otro cuando quieras.
      </p>

      {parents.map((parent) => (
        <div key={parent.userId} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 500, fontSize: 13, margin: 0 }}>{parent.name}</p>
              <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>
                {parent.email ?? "Sin correo registrado"}
                {" · "}
                <span style={{ color: parent.hasAccount ? "#0f766e" : "#b45309", fontWeight: 600 }}>
                  {parent.hasAccount ? "Con cuenta" : "Sin cuenta aún"}
                </span>
              </p>
            </div>
            <button
              onClick={() => handleGenerate(parent.userId)}
              disabled={generate.isLoading || !parent.email}
              title={!parent.email ? "Agrega el correo del tutor para generar su acceso" : undefined}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: parent.email ? "#1D3557" : "var(--color-background-secondary)",
                color: parent.email ? "#fff" : "var(--color-text-tertiary)",
                border: "none", borderRadius: 8, padding: "7px 14px",
                fontSize: 12, fontWeight: 600, cursor: parent.email ? "pointer" : "not-allowed",
              }}
            >
              <RefreshCw size={12} />
              {generate.isLoading && generate.variables?.userId === parent.userId ? "Generando…" : "Generar enlace de acceso"}
            </button>
          </div>

          {link?.userId === parent.userId && (
            <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "var(--color-background-secondary)", borderRadius: 10, padding: 14, minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={link.qr} alt="QR de acceso al portal" width={110} height={110} style={{ borderRadius: 8, background: "#fff", padding: 4, flexShrink: 0 }} />
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 6px", color: "var(--color-text-primary)" }}>
                  Escanéalo con el teléfono del tutor, o cópialo y envíaselo:
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
                  Un solo uso · expira en {link.expiresInDays} días · al abrirlo, el tutor queda dentro del portal y puede crear su contraseña si lo desea.
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {error && (
        <p style={{ fontSize: 12, color: "#dc2626", margin: "10px 0 0" }}>{error}</p>
      )}
    </div>
  );
}
