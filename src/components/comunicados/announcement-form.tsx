"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

const schema = z.object({
  title: z.string().min(1, "El título es requerido"),
  body:  z.string().min(1, "El cuerpo es requerido"),
});

type FormValues = z.infer<typeof schema>;

interface Group { id: string; name: string; discipline: { name: string } }

interface Props {
  groups: Group[];
}

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid var(--color-border-secondary)", fontSize: 14,
  outline: "none", boxSizing: "border-box" as const,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

export function AnnouncementForm({ groups }: Props) {
  const router   = useRouter();
  const create   = api.announcements.create.useMutation();
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [targetAll, setTargetAll]           = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const toggleGroup = (id: string) =>
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);

  const onSubmit = async (data: FormValues) => {
    try {
      await create.mutateAsync({
        title:        data.title,
        body:         data.body,
        targetAll,
        targetGroups: targetAll ? [] : selectedGroups,
      });
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

      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", display: "block", marginBottom: 10 }}>Destinatarios</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="radio" name="targetAll" checked={targetAll} onChange={() => setTargetAll(true)} style={{ accentColor: "#1e3a5f" }} />
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Todos los alumnos y familias</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="radio" name="targetAll" checked={!targetAll} onChange={() => setTargetAll(false)} style={{ accentColor: "#1e3a5f" }} />
            <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Grupos específicos</span>
          </label>
        </div>

        {!targetAll && groups.length > 0 && (
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
