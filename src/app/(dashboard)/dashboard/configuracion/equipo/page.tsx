import { getCurrentContext } from "@/server/request-context";
import { redirect } from "next/navigation";
import { TeamClientView } from "./team-client-view";

export default async function EquipoPage() {
  // Identidad compartida del request (React.cache): el layout ya la pagó
  const ctx = await getCurrentContext();
  if (!ctx?.activeTenant) return null;

  // Solo ADMIN
  if (ctx.activeRole !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingLeft: 16, paddingRight: 16, paddingBottom: 40 }} className="lg:px-0">
      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
            Equipo de Trabajo
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-secondary)" }}>
            Administra los roles, recepcionistas e instructores que tienen acceso a tu plataforma.
          </p>
        </div>
      </div>

      {/* Interfaz Cliente (Listas y Modales de Inivitacion) */}
      <TeamClientView />
    </div>
  );
}
