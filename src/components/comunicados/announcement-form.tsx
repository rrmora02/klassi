"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { StudentSearchPicker, type StudentOption } from "@/components/shared/student-search-picker";
import { User } from "lucide-react";

const schema = z.object({
  title: z.string().min(1, "El título es requerido"),
  body:  z.string().min(1, "El cuerpo es requerido"),
});

type FormValues = z.infer<typeof schema>;

type TargetMode = "all" | "groups" | "student";

interface Group { id: string; name: string; discipline: { name: string } }

interface Props {
  groups:   Group[];
  students: StudentOption[];
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border-secondary)", fontSize: 14,
  outline: "none", boxSizing: "border-box",
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

export function AnnouncementForm({ groups, students }: Props) {
  const router  = useRouter();
  const create  = api.announcements.create.useMutation();

  const [targetMode,      setTargetMode]      = useState<TargetMode>("all");
  const [selectedGroups,  setSelectedGroups]  = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [studentError,    setStudentError]    = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const toggleGroup = (id: string) =>
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const onSubmit = async (data: FormValues) => {
    if (targetMode === "student" && !selectedStudent) {
      setStudentError("Selecciona un alumno");
      return;
    }
    setStudentError("");

    let targetAll    = false;
    let targetGroups: string[] = [];

    if (targetMode === "all") {
      targetAll = true;
    } else if (targetMode === "groups") {
      targetGroups = selectedGroups;
    } else {
      targetGroups = [`student:${selectedStudent!.id}`];
    }

    try {
      await create.mutateAsync({ title: data.title, body: data.body, targetAll, targetGroups });
      router.push("/dashboard/comunicados");
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Error al crear comunicado");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Título</label>
        <input {...register("title")} placeholder="Ej. Cierre por vacaciones" style={inputStyle} />
        {errors.title && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.title.message}</p>}
      </div>

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Mensaje</label>
        <textarea
          {...register("body")}
          rows={6}
          placeholder="Escribe el contenido del comunicado..."
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
        />
        {errors.body && <p style={{ color: "#b91c1c", fontSize: 11, marginTop: 4 }}>{errors.body.message}</p>}
      </div>

      {/* Destinatarios */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>
          Destinatarios
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(["all", "groups", "student"] as TargetMode[]).map(mode => {
            const labels: Record<TargetMode, string> = {
              all:     "Todos los alumnos y familias",
              groups:  "Grupos específicos",
              student: "Alumno / tutor específico",
            };
            return (
              <label key={mode} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="targetMode"
                  checked={targetMode === mode}
                  onChange={() => { setTargetMode(mode); setStudentError(""); }}
                  style={{ accentColor: "#1e3a5f" }}
                />
                <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{labels[mode]}</span>
              </label>
            );
          })}
        </div>

        {/* Selector de grupos */}
        {targetMode === "groups" && groups.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {groups.map(g => {
              const sel = selectedGroups.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                    border: "1px solid var(--color-border-secondary)",
                    background: sel ? "#1e3a5f" : "transparent",
                    color: sel ? "#fff" : "var(--color-text-secondary)",
                    fontWeight: sel ? 500 : 400,
                  }}
                >
                  {g.discipline.name} · {g.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Buscador de alumno */}
        {targetMode === "student" && (
          <div style={{ marginTop: 12 }}>
            <StudentSearchPicker
              students={students}
              value={selectedStudent}
              onChange={s => { setSelectedStudent(s); setStudentError(""); }}
              placeholder="Buscar alumno por nombre..."
              error={studentError}
            />
            {selectedStudent && (
              <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <User size={11} /> El comunicado se enviará a {selectedStudent.firstName} y sus tutores registrados.
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => router.push("/dashboard/comunicados")}
          style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={create.isLoading}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#1e3a5f", color: "#fff", fontSize: 13, fontWeight: 500, cursor: create.isLoading ? "not-allowed" : "pointer" }}
        >
          {create.isLoading ? "Guardando..." : "Crear comunicado"}
        </button>
      </div>
    </form>
  );
}
