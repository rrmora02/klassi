"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { InstructorForm } from "@/components/instructores/instructor-form";
import type { InstructorFormValues } from "@/lib/schemas/instructor.schema";
import Link from "next/link";

export default function NuevoInstructorPage() {
  const router = useRouter();
  const create = api.instructors.create.useMutation();

  async function handleSubmit(data: InstructorFormValues) {
    try {
        await create.mutateAsync(data);
        router.push("/dashboard/instructores");
        router.refresh();
    } catch (error: any) {
        // Podríamos manejar el error visualmente, pero se alinea con el resto de CRUDs
        console.error(error.message || "Ocurrió un error al crear el instructor.");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/instructores" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Instructores</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nuevo instructor</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Nuevo instructor
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <InstructorForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/instructores")}
          submitLabel="Crear instructor"
        />
      </div>
    </div>
  );
}
