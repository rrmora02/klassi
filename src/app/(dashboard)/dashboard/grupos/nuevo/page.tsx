"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { GroupForm } from "@/components/grupos/group-form";
import type { GroupFormValues } from "@/lib/schemas/group.schema";
import Link from "next/link";

export default function NuevoGrupoPage() {
  const router = useRouter();

  const { data: disciplines = [], isLoading: loadingDisc } = api.groups.getDisciplines.useQuery();
  const { data: instructors = [], isLoading: loadingInst } = api.groups.getInstructors.useQuery();
  const create = api.groups.create.useMutation();

  async function handleSubmit(data: GroupFormValues) {
    await create.mutateAsync({
      ...data,
      instructorId: data.instructorId || undefined,
      room:         data.room         || undefined,
    });
    router.push("/dashboard/grupos");
    router.refresh();
  }

  if (loadingDisc || loadingInst) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "var(--color-text-tertiary)", fontSize: 13 }}>
        Cargando...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/grupos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Grupos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nuevo grupo</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Nuevo grupo
      </h1>

      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: 28,
      }}>
        <GroupForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/grupos")}
          submitLabel="Crear grupo"
          disciplines={disciplines}
          instructors={instructors}
        />
      </div>
    </div>
  );
}
