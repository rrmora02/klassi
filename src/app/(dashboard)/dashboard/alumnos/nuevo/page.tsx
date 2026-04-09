"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { StudentForm } from "@/components/alumnos/student-form";
import type { StudentFormValues } from "@/lib/schemas/student.schema";
import Link from "next/link";

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const create = api.students.create.useMutation();

  async function handleSubmit(data: StudentFormValues) {
    await create.mutateAsync({
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    });
    router.push("/dashboard/alumnos");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/alumnos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Alumnos</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nuevo alumno</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Nuevo alumno
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <StudentForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/alumnos")}
          submitLabel="Crear alumno"
        />
      </div>
    </div>
  );
}
