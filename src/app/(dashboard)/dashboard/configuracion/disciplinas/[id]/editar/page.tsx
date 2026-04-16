"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import { DisciplineForm } from "@/components/disciplinas/discipline-form";
import type { DisciplineFormValues } from "@/lib/schemas/discipline.schema";
import Link from "next/link";

interface PageProps {
  params: { id: string };
}

export default function EditarDisciplinaPage({ params }: PageProps) {
  const router = useRouter();
  
  const { data: discipline, isLoading } = api.disciplines.byId.useQuery({ id: params.id });
  const update = api.disciplines.update.useMutation();
  const deleteMutation = api.disciplines.delete.useMutation();

  async function handleSubmit(data: DisciplineFormValues) {
    try {
        await update.mutateAsync({ ...data, id: params.id });
        router.push("/dashboard/configuracion/disciplinas");
        router.refresh();
    } catch (error: any) {
        console.error(error.message || "Error al actualizar disciplina.");
    }
  }

  async function handleDelete() {
    if (confirm("¿Estás seguro de que deseas eliminar esta disciplina? Esto podría afectar grupos existentes si no lo verificas.")) {
        try {
            await deleteMutation.mutateAsync({ id: params.id });
            router.push("/dashboard/configuracion/disciplinas");
            router.refresh();
        } catch (error: any) {
            alert(error.message || "No se puede eliminar la disciplina.");
        }
    }
  }

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando...</div>;
  }

  if (!discipline) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>Disciplina no encontrada</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-secondary)" }}>
            <Link href="/dashboard/configuracion/disciplinas" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>Disciplinas</Link>
            <span>/</span>
            <span style={{ color: "var(--color-text-primary)" }}>{discipline.name}</span>
            <span>/</span>
            <span style={{ color: "var(--color-text-primary)" }}>Editar</span>
          </div>

          <button 
             onClick={handleDelete}
             style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, color: "#ef4444", background: "transparent", border: "1px solid #fee2e2", cursor: "pointer" }}
          >
             Eliminar
          </button>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 24 }}>
        Editar disciplina
      </h1>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 28 }}>
        <DisciplineForm
          initialData={{
             name: discipline.name,
             description: discipline.description || "",
             color: discipline.color || "",
             isActive: discipline.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/configuracion/disciplinas")}
          submitLabel="Guardar cambios"
        />
      </div>
    </div>
  );
}
