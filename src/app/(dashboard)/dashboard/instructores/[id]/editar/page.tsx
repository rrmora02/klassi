"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { InstructorForm } from "@/components/instructores/instructor-form";
import type { InstructorFormValues } from "@/lib/schemas/instructor.schema";
import Link from "next/link";

interface PageProps {
  params: { id: string };
}

export default function EditarInstructorPage({ params }: PageProps) {
  const router = useRouter();
  
  const { data: instructor, isLoading } = api.instructors.byId.useQuery({ id: params.id });
  const update = api.instructors.update.useMutation();

  async function handleSubmit(data: InstructorFormValues) {
    try {
        await update.mutateAsync({ ...data, id: params.id });
        router.push(`/dashboard/instructores/${params.id}`);
        router.refresh();
    } catch (error: any) {
        console.error(error.message || "Error al actualizar instructor.");
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando...</div>;
  }

  if (!instructor) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>Instructor no encontrado</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/instructores" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Instructores</Link>
        <span>/</span>
        <Link href={`/dashboard/instructores/${params.id}`} style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{instructor.user.name}</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Editar</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Editar instructor
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <InstructorForm
          initialData={{
             name: instructor.user.name,
             email: instructor.user.email,
             phone: instructor.phone || "",
             bio: instructor.bio || "",
             isActive: instructor.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/dashboard/instructores/${params.id}`)}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
