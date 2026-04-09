import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { notFound } from "next/navigation";
import { fullName } from "@/lib/utils";
import Link from "next/link";
import { StudentEditForm } from "@/components/alumnos/student-edit-form";

export default async function EditarAlumnoPage({ params }: { params: { id: string } }) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const tenant = await db.tenant.findFirst({ where: { clerkOrgId: orgId } });
  if (!tenant) return null;

  const student = await db.student.findFirst({
    where: { id: params.id, tenantId: tenant.id },
  });
  if (!student) notFound();

  const name = fullName(student.firstName, student.lastName);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
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
        <StudentEditForm student={student} />
      </div>
    </div>
  );
}
