"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupFormSchema, groupFormDefaults, type GroupFormValues } from "@/lib/schemas/group.schema";

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

function Field({ label, error, required, children, style }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--color-text-secondary)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
        {required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 11.5, color: "var(--color-error)", marginTop: 1 }}>{error}</p>
      )}
    </div>
  );
}

const inputBaseStyle = (error?: boolean): React.CSSProperties => ({
  width: "100%",
  border: `1px solid ${error ? "var(--input-error-border)" : "var(--input-border)"}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  background: "var(--input-bg)",
  color: "var(--input-text)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
});

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(({ error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      {...props}
      style={{ ...inputBaseStyle(error), ...(props.style ?? {}) }}
      onFocus={e => {
        e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-focus-border)";
        e.target.style.boxShadow = error ? "0 0 0 3px var(--input-error-ring)" : "0 0 0 3px var(--input-focus-ring)";
      }}
      onBlur={e => {
        e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-border)";
        e.target.style.boxShadow = "none";
      }}
    />
  );
});
Input.displayName = "Input";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(({ error, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      {...props}
      style={{
        ...inputBaseStyle(error),
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 36,
      }}
      onFocus={e => {
        e.target.style.borderColor = "var(--input-focus-border)";
        e.target.style.boxShadow = "0 0 0 3px var(--input-focus-ring)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? "var(--input-error-border)" : "var(--input-border)";
        e.target.style.boxShadow = "none";
      }}
    >
      {children}
    </select>
  );
});
Select.displayName = "Select";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--color-text-tertiary)",
        paddingBottom: 12,
        borderBottom: "1px solid var(--color-border-tertiary)",
        marginBottom: 20,
      }}
    >
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

// ─── Componente principal ─────────────────────────────────────────

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
    watch,
    formState: { errors, isDirty },
  } = useForm<GroupFormValues>({
    resolver:      zodResolver(groupFormSchema),
    defaultValues: { ...groupFormDefaults, ...defaultValues },
    mode:          "onBlur",
  });

  async function handleFormSubmit(data: GroupFormValues) {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado a guardar.";
      setServerError(msg);
    }
  }

  const currentType = watch("type");
  const disabled = isSubmitting || (isEdit && !isDirty);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>

      {serverError && (
        <div
          style={{
            background: "var(--color-error-bg)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--color-error-text)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Datos generales ──────────────────────────── */}
      <SectionTitle>Datos generales</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Field label="Nombre del grupo" required error={errors.name?.message}>
          <Input
            {...register("name")}
            placeholder="Ej: Ballet Intermedio A"
            error={!!errors.name}
            autoFocus={!isEdit}
          />
        </Field>
        <Field label="Nivel Inicial" required error={errors.level?.message}>
          <Select {...register("level")} error={!!errors.level}>
            {LEVEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Modalidad Estratégica" error={errors.type?.message} style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          {[
            {
              value: "FIXED",
              title: "Estación Fija (Recomendado)",
              desc: "El nivel del grupo NO cambia. Los alumnos avanzan mudándose (transfiriéndose) a otros grupos de mayor nivel.",
            },
            {
              value: "PROGRESSIVE",
              title: "Generacional",
              desc: "Todos los alumnos avanzan juntos. El operador de Klassi subirá manualmente el nivel general de este grupo en navidad o fin de ciclo.",
            },
          ].map(opt => {
            const selected = currentType === opt.value;
            return (
              <label
                key={opt.value}
                style={{
                  border: `1.5px solid ${selected ? "var(--input-focus-border)" : "var(--input-border)"}`,
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  background: selected ? "var(--color-primary-light)" : "var(--color-background-primary)",
                  boxShadow: selected ? "0 0 0 3px var(--input-focus-ring)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="radio"
                    value={opt.value}
                    {...register("type")}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {opt.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      {opt.desc}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </Field>

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

      {/* ── Horario (Cuadrícula Semanal UX) ──────────── */}
      <SectionTitle>Horario de Clases</SectionTitle>
      <div
        style={{
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-tertiary)",
          borderRadius: 10,
          padding: 20,
          marginBottom: 28,
        }}
      >
        <Controller
          control={control}
          name="schedule"
          render={({ field }) => {
            const handleToggleDay = (dayValue: string, isChecked: boolean) => {
               if (isChecked) {
                  const newSlot = { day: dayValue as any, startTime: "16:00", endTime: "17:00" };

                  // Copiar horario del último día agregado (si existe) para acelerar data-entry
                  if (field.value.length > 0) {
                     const lastSlot = field.value[field.value.length - 1];
                     newSlot.startTime = lastSlot.startTime;
                     newSlot.endTime = lastSlot.endTime;
                  }

                  field.onChange([...field.value, newSlot]);
               } else {
                  field.onChange(field.value.filter(s => s.day !== dayValue));
               }
            };

            const handleTimeChange = (dayValue: string, key: "startTime" | "endTime", val: string) => {
               field.onChange(field.value.map(s => s.day === dayValue ? { ...s, [key]: val } : s));
            };

            return (
               <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                 {DAY_OPTIONS.map((d) => {
                    const slot = field.value.find(s => s.day === d.value);
                    const isChecked = !!slot;
                    return (
                      <div
                        key={d.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          minHeight: 40,
                          padding: "4px 0",
                        }}
                      >
                         {/* Checkbox y Día */}
                         <label
                           style={{
                             display: "flex",
                             gap: 10,
                             alignItems: "center",
                             width: 140,
                             cursor: "pointer",
                             opacity: isChecked ? 1 : 0.55,
                             transition: "opacity 0.15s",
                           }}
                         >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleDay(d.value, e.target.checked)}
                              style={{ width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}
                            />
                            <span
                              style={{
                                fontSize: 13,
                                color: "var(--color-text-primary)",
                                fontWeight: isChecked ? 600 : 400,
                              }}
                            >
                              {d.label}
                            </span>
                         </label>

                         {/* Entradas de Tiempo */}
                         {isChecked && slot && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                background: "#fff",
                                padding: "5px 10px",
                                borderRadius: 8,
                                border: "1px solid var(--input-border)",
                                boxShadow: "var(--shadow-xs)",
                              }}
                            >
                               <input
                                 type="time"
                                 value={slot.startTime}
                                 onChange={(e) => handleTimeChange(d.value, "startTime", e.target.value)}
                                 style={{
                                   padding: "3px",
                                   fontSize: 13,
                                   outline: "none",
                                   border: "none",
                                   color: "var(--color-text-primary)",
                                   background: "transparent",
                                 }}
                               />
                               <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: 500 }}>→</span>
                               <input
                                 type="time"
                                 value={slot.endTime}
                                 onChange={(e) => handleTimeChange(d.value, "endTime", e.target.value)}
                                 style={{
                                   padding: "3px",
                                   fontSize: 13,
                                   outline: "none",
                                   border: "none",
                                   color: "var(--color-text-primary)",
                                   background: "transparent",
                                 }}
                               />
                            </div>
                         )}
                      </div>
                    );
                 })}

                 {/* Mostrar validaciones o fallos directamente ligados a `schedule` */}
                 {errors.schedule?.message && (
                    <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 8 }}>
                      {errors.schedule.message}
                    </p>
                 )}
                 {Array.isArray(errors.schedule) && errors.schedule.find(e => e?.endTime?.message) && (
                     <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4 }}>
                       Hay un error en las horas de algunos días (la hora de fin debe ser mayor a la de inicio).
                     </p>
                 )}
               </div>
            );
          }}
        />
      </div>

      {/* ── Acciones ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          paddingTop: 20,
          borderTop: "1px solid var(--color-border-tertiary)",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            border: "1px solid var(--color-border-secondary)",
            borderRadius: 8,
            padding: "9px 20px",
            fontSize: 13,
            fontWeight: 500,
            background: "transparent",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          style={{
            background: disabled
              ? "var(--color-border-secondary)"
              : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: disabled ? "var(--color-text-tertiary)" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 24px",
            fontSize: 13,
            fontWeight: 500,
            cursor: isSubmitting ? "wait" : disabled ? "not-allowed" : "pointer",
            boxShadow: disabled ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
            transition: "all 0.15s",
          }}
        >
          {isSubmitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
