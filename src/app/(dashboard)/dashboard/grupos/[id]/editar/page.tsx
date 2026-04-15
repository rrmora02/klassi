import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { GroupEditClient } from "./group-edit-client";

export default async function EditarGrupoPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  const tenant = user?.activeTenantId ? await db.tenant.findUnique({ where: { id: user.activeTenantId } }) : null;
  if (!tenant) return null;

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
