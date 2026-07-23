"use client";

import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, ShieldCheck, Check, Eye, EyeOff } from "lucide-react";

// Cuenta del tutor/instructor en el portal: crear o cambiar su contraseña
// (el acceso inicial es por enlace mágico, sin contraseña) y cerrar sesión.
// Formulario propio con la API de Clerk (user.updatePassword) para que se
// vea bien en el teléfono; nadie del staff conoce ni fija la contraseña.

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
  border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10,
  padding: "11px 40px 11px 12px", fontSize: 15, // 15px+ evita zoom en iOS
};

function PasswordField({
  label, value, onChange, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar" : "Mostrar"}
          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", padding: 6, cursor: "pointer", color: "var(--color-text-tertiary)", display: "flex" }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function CuentaPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const hasPassword = user?.passwordEnabled ?? false;

  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (next.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (next !== confirm) { setError("Las contraseñas no coinciden."); return; }

    setSaving(true);
    try {
      await user!.updatePassword({
        newPassword: next,
        ...(hasPassword ? { currentPassword: current } : {}),
        signOutOfOtherSessions: false,
      });
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      const clerkMsg = (err as { errors?: { longMessage?: string; message?: string }[] })?.errors?.[0];
      setError(clerkMsg?.longMessage || clerkMsg?.message || "No se pudo guardar la contraseña. Verifica los datos e intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Mi cuenta</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          {isLoaded ? (user?.primaryEmailAddress?.emailAddress ?? "Gestiona tu acceso") : "…"}
        </p>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <ShieldCheck size={16} style={{ color: "#1D3557", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {hasPassword
            ? "Cambia tu contraseña cuando quieras. La usas junto con tu correo para iniciar sesión."
            : "Entraste con un enlace de tu escuela. Crea una contraseña para poder iniciar sesión con tu correo cuando el enlace expire."}
        </p>
      </div>

      {/* Formulario de contraseña */}
      <form onSubmit={handleSave} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
        </p>

        {hasPassword && (
          <PasswordField label="Contraseña actual" value={current} onChange={setCurrent} autoComplete="current-password" />
        )}
        <PasswordField label="Nueva contraseña" value={next} onChange={setNext} autoComplete="new-password" />
        <PasswordField label="Confirmar contraseña" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        {error && <p style={{ fontSize: 12.5, color: "#dc2626", margin: 0, lineHeight: 1.4 }}>{error}</p>}
        {done && (
          <p style={{ fontSize: 12.5, color: "#0f766e", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <Check size={14} /> Contraseña guardada correctamente.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !isLoaded}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "#1D3557", color: "#fff", border: "none", borderRadius: 10,
            padding: "12px 16px", fontSize: 14, fontWeight: 600,
            cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, width: "100%",
          }}
        >
          {saving ? "Guardando…" : hasPassword ? "Guardar cambios" : "Crear contraseña"}
        </button>
      </form>

      <button
        onClick={() => signOut({ redirectUrl: "/sign-in" })}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
          background: "transparent", color: "#dc2626",
          border: "0.5px solid var(--color-border-secondary)", borderRadius: 10,
          padding: "12px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "100%",
        }}
      >
        <LogOut size={15} /> Cerrar sesión
      </button>
    </div>
  );
}
