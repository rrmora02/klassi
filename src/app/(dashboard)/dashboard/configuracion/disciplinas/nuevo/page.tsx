"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { DisciplineForm } from "@/components/disciplinas/discipline-form";
import type { DisciplineFormValues } from "@/lib/schemas/discipline.schema";
import Link from "next/link";

export default function NuevaDisciplinaPage() {
  const router = useRouter();
  const create = api.disciplines.create.useMutation();

  async function handleSubmit(data: DisciplineFormValues) {
    try {
        await create.mutateAsync(data);
        router.push("/dashboard/configuracion/disciplinas");
        router.refresh();
    } catch (error: any) {
        console.error(error.message || "Ocurrió un error al crear la disciplina.");
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <Link href="/dashboard/configuracion/disciplinas" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Disciplinas</Link>
        <span>/</span>
        <span style={{ color: "var(--color-text-primary)" }}>Nueva disciplina</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Nueva disciplina
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <DisciplineForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/configuracion/disciplinas")}
          submitLabel="Crear disciplina"
        />
      </div>
    </div>
  );
}
