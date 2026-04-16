import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { TeamClientView } from "./team-client-view";

export default async function EquipoPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenantId = user?.activeTenantId;
  if (!tenantId) return null;

  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) notFound();

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
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
