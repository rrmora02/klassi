"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupFormSchema, groupFormDefaults, type GroupFormValues } from "@/lib/schemas/group.schema";
import { useState } from "react";

// ─── Etiquetas de día ─────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: "MON", label: "Lunes" },
  { value: "TUE", label: "Martes" },
  { value: "WED", label: "Miércoles" },
  { value: "THU", label: "Jueves" },
  { value: "FRI", label: "Viernes" },
  { value: "SAT", label: "Sábado" },
  { value: "SUN", label: "Domingo" },
] as const;

const LEVEL_OPTIONS = [
  { value: "BEGINNER",     label: "Principiante" },
  { value: "INTERMEDIATE", label: "Intermedio" },
  { value: "ADVANCED",     label: "Avanzado" },
  { value: "PROFESSIONAL", label: "Profesional" },
] as const;

// ─── Primitivos del formulario ────────────────────────────────────

function Field({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#e53e3e", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#c53030", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      style={{
        width: "100%", border: `0.5px solid ${error ? "#fc8181" : "var(--color-border-secondary)"}`,
        borderRadius: 8, padding: "8px 12px", fontSize: 14,
        background: "var(--color-background-primary)", color: "var(--color-text-primary)",
        outline: "none", boxSizing: "border-box", ...(props.style ?? {}),
      }}
      onFocus={e => { e.target.style.borderColor = error ? "#fc8181" : "#378ADD"; e.target.style.boxShadow = "0 0 0 3px rgba(55,138,221,.12)"; }}
      onBlur={e  => { e.target.style.borderColor = error ? "#fc8181" : "var(--color-border-secondary)"; e.target.style.boxShadow = "none"; }}
    />
  );
}

function Select({ error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      style={{
        width: "100%", border: `0.5px solid ${error ? "#fc8181" : "var(--color-border-secondary)"}`,
        borderRadius: 8, padding: "8px 12px", fontSize: 14,
        background: "var(--color-background-primary)", color: "var(--color-text-primary)",
        outline: "none", boxSizing: "border-box",
      }}
    >
      {children}
    </select>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em",
      color: "var(--color-text-tertiary)", paddingBottom: 10,
      borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────

interface Discipline { id: string; name: string }
interface Instructor { id: string; user: { name: string | null } }

interface GroupFormProps {
  defaultValues?: Partial<GroupFormValues>;
  onSubmit:       (data: GroupFormValues) => Promise<void>;
  onCancel:       () => void;
  submitLabel?:   string;
  isEdit?:        boolean;
  disciplines:    Discipline[];
  instructors:    Instructor[];
}

// ─── Componente ───────────────────────────────────────────────────

export function GroupForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Guardar grupo",
  isEdit = false,
  disciplines,
  instructors,
}: GroupFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<GroupFormValues>({
    resolver:      zodResolver(groupFormSchema),
    defaultValues: { ...groupFormDefaults, ...defaultValues },
    mode:          "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "schedule" });

  async function handleFormSubmit(data: GroupFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      setServerError(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>

      {serverError && (
        <div style={{
          background: "#fff5f5", border: "0.5px solid #fc8181", borderRadius: 8,
          padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#c53030",
        }}>
          {serverError}
        </div>
      )}

      {/* ── Datos generales ──────────────────────────── */}
      <SectionTitle>Datos generales</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Nombre del grupo" required error={errors.name?.message}>
          <Input
            {...register("name")}
            placeholder="Ej: Ballet Intermedio A"
            error={!!errors.name}
            autoFocus={!isEdit}
          />
        </Field>
        <Field label="Nivel" required error={errors.level?.message}>
          <Select {...register("level")} error={!!errors.level}>
            {LEVEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ── Asignación ───────────────────────────────── */}
      <SectionTitle>Asignación</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Disciplina" required error={errors.disciplineId?.message}>
          <Select {...register("disciplineId")} error={!!errors.disciplineId}>
            <option value="">Selecciona una disciplina</option>
            {disciplines.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Instructor" error={errors.instructorId?.message}>
          <Select {...register("instructorId")} error={!!errors.instructorId}>
            <option value="">Sin instructor</option>
            {instructors.map(i => (
              <option key={i.id} value={i.id}>{i.user.name ?? "Sin nombre"}</option>
            ))}
          </Select>
        </Field>
      </div>

      {/* ── Capacidad y aula ─────────────────────────── */}
      <SectionTitle>Capacidad y aula</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Capacidad máxima" required error={errors.capacity?.message}>
          <Input
            {...register("capacity", { valueAsNumber: true })}
            type="number"
            min={1}
            max={200}
            error={!!errors.capacity}
          />
        </Field>
        <Field label="Aula / Cancha" error={errors.room?.message}>
          <Input
            {...register("room")}
            placeholder="Ej: Salón 3, Cancha A"
            error={!!errors.room}
          />
        </Field>
      </div>

      {/* ── Horario ──────────────────────────────────── */}
      <SectionTitle>Horario</SectionTitle>
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 10, padding: 16, marginBottom: 24,
      }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: "0 0 140px" }}>
              <select
                {...register(`schedule.${index}.day`)}
                style={{
                  width: "100%", border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 8, padding: "8px 10px", fontSize: 13,
                  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                  outline: "none",
                }}
              >
                {DAY_OPTIONS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <input
                {...register(`schedule.${index}.startTime`)}
                type="time"
                style={{
                  width: "100%", border: `0.5px solid ${errors.schedule?.[index]?.startTime ? "#fc8181" : "var(--color-border-secondary)"}`,
                  borderRadius: 8, padding: "8px 10px", fontSize: 13,
                  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <span style={{ fontSize: 16, color: "var(--color-text-tertiary)", paddingTop: 8, flexShrink: 0 }}>–</span>

            <div style={{ flex: 1 }}>
              <input
                {...register(`schedule.${index}.endTime`)}
                type="time"
                style={{
                  width: "100%", border: `0.5px solid ${errors.schedule?.[index]?.endTime ? "#fc8181" : "var(--color-border-secondary)"}`,
                  borderRadius: 8, padding: "8px 10px", fontSize: 13,
                  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              {errors.schedule?.[index]?.endTime && (
                <p style={{ fontSize: 11, color: "#c53030", marginTop: 2 }}>
                  {errors.schedule[index].endTime?.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              style={{
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
                padding: "8px 10px", fontSize: 13, background: "transparent",
                color: fields.length === 1 ? "var(--color-text-tertiary)" : "#dc2626",
                cursor: fields.length === 1 ? "not-allowed" : "pointer", flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}

        {errors.schedule?.message && (
          <p style={{ fontSize: 12, color: "#c53030", marginBottom: 8 }}>
            {errors.schedule.message}
          </p>
        )}

        <button
          type="button"
          onClick={() => append({ day: "MON", startTime: "", endTime: "" })}
          style={{
            border: "0.5px dashed var(--color-border-secondary)", borderRadius: 8,
            padding: "7px 16px", fontSize: 13, background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer", width: "100%",
          }}
        >
          + Agregar horario
        </button>
      </div>

      {/* ── Acciones ─────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
            padding: "8px 20px", fontSize: 13, background: "transparent",
            color: "var(--color-text-secondary)", cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (isEdit && !isDirty)}
          style={{
            background: isSubmitting || (isEdit && !isDirty) ? "#94a3b8" : "#1e3a5f",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 24px", fontSize: 13, fontWeight: 500,
            cursor: isSubmitting ? "wait" : "pointer",
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
