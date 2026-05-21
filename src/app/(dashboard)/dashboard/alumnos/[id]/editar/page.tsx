import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/utils";
import Link from "next/link";
import { StudentEditFormClient } from "@/components/alumnos/student-edit-form-client";
import { getDashboardContext } from "@/server/auth/dashboard-context";

export default async function EditarAlumnoPage({ params }: { params: { id: string } }) {
  const { tenant } = await getDashboardContext();

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: tenant.id },
    include: {
      parents: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          relationship: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      },
    },
  });

  if (!student) notFound();

  const name = fullName(student.firstName, student.lastName);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/alumnos" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Alumnos</Link>
        <span>/</span>
        <Link href={`/dashboard/alumnos/${student.id}`} style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>{name}</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Editar</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Editar — {name}
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <StudentEditFormClient student={student} studentId={params.id} />
      </div>
    </div>
  );
}
