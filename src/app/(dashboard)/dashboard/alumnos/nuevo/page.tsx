"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { StudentForm } from "@/components/alumnos/student-form";
import { EnrollToGroupModal } from "@/components/alumnos/enroll-to-group-modal";
import type { StudentFormValues } from "@/lib/schemas/student.schema";
import Link from "next/link";
import { useState } from "react";

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const [newStudentId, setNewStudentId] = useState<string | null>(null);
  const create = api.students.create.useMutation();

  async function handleSubmit(data: StudentFormValues) {
    const student = await create.mutateAsync({
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    });
    setNewStudentId(student.id);
  }

  if (newStudentId) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <Link href="/dashboard/alumnos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Alumnos</Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-primary)" }}>Nuevo alumno</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
          Alumno creado exitosamente
        </h1>

        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 24 }}>
            ¿Deseas inscribir al alumno a un grupo ahora?
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
            <EnrollToGroupModal studentId={newStudentId} />
            <button
              onClick={() => {
                router.push("/dashboard/alumnos");
                router.refresh();
              }}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "0.5px solid var(--color-border-secondary)",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Hacer después
            </button>
          </div>
        </div>
      </div>
    );
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
