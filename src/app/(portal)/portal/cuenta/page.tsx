"use client";

import { UserProfile, useClerk, useUser } from "@clerk/nextjs";
import { LogOut, ShieldCheck } from "lucide-react";

// Cuenta del tutor en el portal: aquí puede crear o cambiar su contraseña
// (el acceso inicial es por enlace mágico, sin contraseña) y cerrar sesión.
// La gestión de contraseña usa el componente seguro de Clerk: nadie del
// staff conoce ni fija la contraseña del tutor.

export default function CuentaPage() {
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Mi cuenta</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          {user?.primaryEmailAddress?.emailAddress ?? "Gestiona tu acceso"}
        </p>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <ShieldCheck size={16} style={{ color: "#1D3557", flexShrink: 0, marginTop: 2 }} />
        <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          Entraste con un enlace de tu escuela. Si quieres poder entrar cuando el
          enlace expire, crea una contraseña abajo en <strong>Seguridad → Contraseña</strong>.
          Así podrás iniciar sesión con tu correo y contraseña cuando quieras.
        </p>
      </div>

      {/* Componente seguro de Clerk: perfil, correo y contraseña */}
      <div style={{ overflowX: "auto", borderRadius: 12 }}>
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox:  { width: "100%" },
              card:     { width: "100%", boxShadow: "none", border: "0.5px solid var(--color-border-tertiary)" },
              navbar:   { display: "none" },
              navbarMobileMenuRow: { display: "none" },
              scrollBox: { borderRadius: 12 },
            },
            variables: { colorPrimary: "#1D3557" },
          }}
        />
      </div>

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
