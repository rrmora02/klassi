"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { StudentForm } from "./student-form";
import { EnrollToGroupModal } from "./enroll-to-group-modal";
import type { StudentFormValues } from "@/lib/schemas/student.schema";
import type { Student } from "@prisma/client";
import Link from "next/link";
import { fullName } from "@/lib/utils";

interface Props {
  student: Student & { parents?: { relationship: string | null; user: { name: string; email: string; phone: string | null; } }[] };
  studentId: string;
}

export function StudentEditFormClient({ student, studentId }: Props) {
  const router = useRouter();
  const update = api.students.update.useMutation();

  const primaryParent = student.parents?.[0];
  const name = fullName(student.firstName, student.lastName);

  // Mapear los datos del alumno al formato del formulario
  const defaultValues: Partial<StudentFormValues> = {
    firstName: student.firstName,
    lastName: student.lastName,
    birthDate: student.birthDate
      ? student.birthDate.toISOString().split("T")[0]
      : "",
    gender: student.gender as StudentFormValues["gender"],
    phone: student.phone ?? "",
    email: student.email ?? "",
    notes: student.notes ?? "",
    tutorName: primaryParent?.user.name ?? "",
    tutorEmail: primaryParent?.user.email ?? "",
    tutorPhone: primaryParent?.user.phone ?? "",
    tutorRelationship: (primaryParent?.relationship as any) ?? undefined,
    currentBeltColor: student.currentBeltColor ?? undefined,
  };

  async function handleSubmit(data: StudentFormValues) {
    await update.mutateAsync({
      id: student.id,
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
    });
    // Redirigir al listado de alumnos para ver el cambio
    router.push("/dashboard/alumnos?updated=true");
    router.refresh();
  }

  return (
    <StudentForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/dashboard/alumnos/${studentId}`)}
      submitLabel="Guardar cambios"
      isEdit
    />
  );
}
