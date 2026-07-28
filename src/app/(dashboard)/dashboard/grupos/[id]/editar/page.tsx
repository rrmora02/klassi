import { db } from "@/server/db";
import { getCurrentContext } from "@/server/request-context";
import { notFound } from "next/navigation";
import { GroupEditClient } from "./group-edit-client";

export default async function EditarGrupoPage({ params }: { params: { id: string } }) {
  // Identidad compartida del request (React.cache): el layout ya la pagó
  const ctx = await getCurrentContext();
  if (!ctx?.activeTenant) return null;
  const tenant = ctx.activeTenant;

  const [group, disciplines, instructors] = await Promise.all([
    db.group.findFirst({
      where: { id: params.id, tenantId: tenant.id },
    }),
    db.discipline.findMany({
      where:   { tenantId: tenant.id, isActive: true },
      orderBy: { sortOrder: "asc" },
      select:  { id: true, name: true, color: true },
    }),
    db.instructor.findMany({
      where:   { tenantId: tenant.id, isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!group) notFound();

  return (
    <GroupEditClient
      group={group}
      disciplines={disciplines}
      instructors={instructors}
    />
  );
}
