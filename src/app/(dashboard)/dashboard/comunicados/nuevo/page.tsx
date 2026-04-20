import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { AnnouncementForm } from "@/components/comunicados/announcement-form";
import Link from "next/link";

export default async function NuevoComunicadoPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  const [groups, students] = await Promise.all([
    db.group.findMany({
      where:   { tenantId: tenant.id, isActive: true },
      select:  { id: true, name: true, discipline: { select: { name: true } } },
      orderBy: [{ discipline: { name: "asc" } }, { name: "asc" }],
    }),
    db.student.findMany({
      where:   { tenantId: tenant.id, status: "ACTIVE" },
      select:  { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/comunicados" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Comunicados</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nuevo comunicado</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 6 }}>
        Nuevo comunicado
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
        Los comunicados se guardan como borrador. Puedes enviarlo desde la lista.
      </p>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <AnnouncementForm groups={groups} students={students} />
      </div>
    </div>
  );
}
