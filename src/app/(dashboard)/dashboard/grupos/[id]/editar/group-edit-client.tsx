"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { GroupForm } from "@/components/grupos/group-form";
import type { GroupFormValues, ScheduleSlot } from "@/lib/schemas/group.schema";
import Link from "next/link";
import type { Group } from "@prisma/client";

interface Discipline { id: string; name: string; color: string | null }
interface Instructor { id: string; user: { name: string | null } }

interface Props {
  group:       Group;
  disciplines: Discipline[];
  instructors: Instructor[];
}

export function GroupEditClient({ group, disciplines, instructors }: Props) {
  const router = useRouter();
  const update = api.groups.update.useMutation();

  const schedule = group.schedule as unknown as ScheduleSlot[];

  const defaultValues: Partial<GroupFormValues> = {
    name:         group.name,
    disciplineId: group.disciplineId,
    instructorId: group.instructorId ?? "",
    level:        group.level,
    capacity:     group.capacity,
    room:         group.room ?? "",
    schedule:     schedule.length > 0
      ? schedule
      : [{ day: "MON", startTime: "", endTime: "" }],
    monthlyFee:   group.monthlyFee ?? null,
    billingDay:   group.billingDay ?? null,
  };

  async function handleSubmit(data: GroupFormValues) {
    await update.mutateAsync({
      id: group.id,
      ...data,
      instructorId: data.instructorId || undefined,
      room:         data.room         || undefined,
    });
    router.push(`/dashboard/grupos/${group.id}`);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/grupos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Grupos</Link>
        <span>/</span>
        <Link href={`/dashboard/grupos/${group.id}`} style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{group.name}</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Editar</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Editar grupo
      </h1>

      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: 28,
      }}>
        <GroupForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/grupos/${group.id}`)}
          submitLabel="Guardar cambios"
          isEdit
          disciplines={disciplines}
          instructors={instructors}
        />
      </div>
    </div>
  );
}
