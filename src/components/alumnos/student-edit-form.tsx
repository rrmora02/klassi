"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { StudentForm } from "./student-form";
import type { StudentFormValues } from "@/lib/schemas/student.schema";
import type { Student } from "@prisma/client";

interface Props {
  student: Student & { parents?: { relationship: string | null; user: { name: string; email: string; phone: string | null; } }[] };
}

export function StudentEditForm({ student }: Props) {
  const router  = useRouter();
  const update  = api.students.update.useMutation();

  const primaryParent = student.parents?.[0];

  // Mapear los datos del alumno al formato del formulario
  const defaultValues: Partial<StudentFormValues> = {
    firstName:  student.firstName,
    lastName:   student.lastName,
    birthDate:  student.birthDate
      ? student.birthDate.toISOString().split("T")[0]
      : "",
    gender:     student.gender as StudentFormValues["gender"],
    phone:      student.phone  ?? "",
    email:      student.email  ?? "",
    notes:      student.notes  ?? "",
    tutorName:  primaryParent?.user.name ?? "",
    tutorEmail: primaryParent?.user.email ?? "",
    tutorPhone: primaryParent?.user.phone ?? "",
    tutorRelationship: (primaryParent?.relationship as any) ?? undefined,
  };

  async function handleSubmit(data: StudentFormValues) {
    await update.mutateAsync({
      id: student.id,
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      email:     data.email    || undefined,
      phone:     data.phone    || undefined,
      notes:     data.notes    || undefined,
    });
    router.push(`/dashboard/alumnos/${student.id}`);
    router.refresh();
  }

  return (
    <StudentForm
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/dashboard/alumnos/${student.id}`)}
      submitLabel="Guardar cambios"
      isEdit
    />
  );
}
