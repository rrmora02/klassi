"use client";

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupFormSchema, groupFormDefaults, type GroupFormValues } from "@/lib/schemas/group.schema";
import { cn } from "@/lib/utils";

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
const timeCls  = "rounded px-2 py-1 text-sm bg-transparent text-gray-900 dark:text-gray-100 outline-none border-none [color-scheme:light] dark:[color-scheme:dark]";

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
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={cn(inputCls, error && "border-red-300 dark:border-red-500", className)}
    />
  )
);
Input.displayName = "Input";

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
  ({ error, className, children, ...props }, ref) => (
    <select
      ref={ref}
      {...props}
      className={cn(selectCls, error && "border-red-300 dark:border-red-500", className)}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} noValidate>

      {serverError && (
        <div style={{
          background: "rgba(220,38,38,0.08)", border: "0.5px solid rgba(220,38,38,0.25)", borderRadius: 8,
          padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#ef4444",
        }}>
          {serverError}
        </div>
      )}

      {/* ── Datos generales ──────────────────────────── */}
      <SectionTitle>Datos generales</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            Modalidad Estratégica
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className={cn(
              "block rounded-xl border-[1.5px] p-4 cursor-pointer transition-colors",
              currentType === "FIXED"
                ? "border-sb-accent bg-sb-light/30 dark:bg-sb-accent/[0.12] dark:border-sb-accent"
                : "border-gray-200 dark:border-[rgba(255,255,255,0.15)] bg-white dark:bg-sb-house hover:bg-gray-50 dark:hover:bg-sb-uplift"
            )}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="radio" value="FIXED" {...register("type")} className="mt-1 accent-sb-accent" />
                <div>
                  <h4 className={cn("m-0 mb-1 text-[13px] font-semibold", currentType === "FIXED" ? "text-sb-green dark:text-sb-light" : "text-gray-800 dark:text-gray-100")}>
                    Estación Fija <span className="text-[11px] font-normal text-sb-accent">(Recomendado)</span>
                  </h4>
                  <p className="m-0 text-xs leading-[1.5] text-gray-500 dark:text-sb-light/60">
                    El nivel del grupo NO cambia. Los alumnos avanzan mudándose (transfiriéndose) a otros grupos de mayor nivel.
                  </p>
                </div>
              </div>
            </label>
            <label className={cn(
              "block rounded-xl border-[1.5px] p-4 cursor-pointer transition-colors",
              currentType === "PROGRESSIVE"
                ? "border-sb-accent bg-sb-light/30 dark:bg-sb-accent/[0.12] dark:border-sb-accent"
                : "border-gray-200 dark:border-[rgba(255,255,255,0.15)] bg-white dark:bg-sb-house hover:bg-gray-50 dark:hover:bg-sb-uplift"
            )}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="radio" value="PROGRESSIVE" {...register("type")} className="mt-1 accent-sb-accent" />
                <div>
                  <h4 className={cn("m-0 mb-1 text-[13px] font-semibold", currentType === "PROGRESSIVE" ? "text-sb-green dark:text-sb-light" : "text-gray-800 dark:text-gray-100")}>
                    Generacional
                  </h4>
                  <p className="m-0 text-xs leading-[1.5] text-gray-500 dark:text-sb-light/60">
                    Todos los alumnos avanzan juntos. El operador de Klassi subirá manualmente el nivel general de este grupo en navidad o fin de ciclo.
                  </p>
                </div>
              </div>
            </label>
          </div>
          {errors.type && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 6 }}>{errors.type.message}</p>}
        </div>
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

      {/* ── Horario (Cuadrícula Semanal UX) ──────────── */}
      <SectionTitle>Horario de Clases</SectionTitle>
      <div style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 10, padding: 20, marginBottom: 24,
      }}>
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
               <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                 {DAY_OPTIONS.map((d) => {
                    const slot = field.value.find(s => s.day === d.value);
                    const isChecked = !!slot;
                    return (
                      <div key={d.value} style={{ display: "flex", alignItems: "center", minHeight: 38 }}>
                         {/* Checkbox y Día */}
                         <label style={{ display: "flex", gap: 10, alignItems: "center", width: 140, cursor: "pointer", opacity: isChecked ? 1 : 0.6 }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleDay(d.value, e.target.checked)}
                              style={{ width: 16, height: 16, cursor: "pointer" }}
                            />
                            <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: isChecked ? 600 : 400 }}>
                              {d.label}
                            </span>
                         </label>

                         {/* Entradas de Tiempo */}
                         {isChecked && slot && (
                            <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house px-3 py-1.5">
                               <input
                                 type="time"
                                 value={slot.startTime}
                                 onChange={(e) => handleTimeChange(d.value, "startTime", e.target.value)}
                                 className={timeCls}
                               />
                               <span style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>a</span>
                               <input
                                 type="time"
                                 value={slot.endTime}
                                 onChange={(e) => handleTimeChange(d.value, "endTime", e.target.value)}
                                 className={timeCls}
                               />
                            </div>
                         )}
                      </div>
                    );
                 })}

                 {/* Mostrar validaciones o fallos directamente ligados a `schedule` */}
                 {errors.schedule?.message && (
                    <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>
                      {errors.schedule.message}
                    </p>
                 )}
                 {Array.isArray(errors.schedule) && errors.schedule.find(e => e?.endTime?.message) && (
                     <p style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                       Hay un error en las horas de algunos días (la hora de fin debe ser mayor a la de inicio).
                     </p>
                 )}
               </div>
            );
          }}
        />
      </div>

      {/* ── Cobro mensual ────────────────────────────── */}
      <SectionTitle>Cobro mensual (opcional)</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Mensualidad (MXN)" error={errors.monthlyFee?.message}>
          <Input
            {...register("monthlyFee", { setValueAs: v => (v === "" || v === null || v === undefined) ? null : Number(v) })}
            type="number"
            step="0.01"
            min={0}
            placeholder="Ej: 500.00"
            error={!!errors.monthlyFee}
          />
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Monto que se cobrará automáticamente cada mes a todos los alumnos del grupo.
          </p>
        </Field>
        <Field label="Día de cobro" error={errors.billingDay?.message}>
          <Input
            {...register("billingDay", { setValueAs: v => (v === "" || v === null || v === undefined) ? null : Number(v) })}
            type="number"
            min={1}
            max={28}
            placeholder="Ej: 5"
            error={!!errors.billingDay}
          />
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
            Día del mes en que se generará el cobro (1-28). Deja vacío para no generar cobros automáticos.
          </p>
        </Field>
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
            background: isSubmitting || (isEdit && !isDirty) ? "#64748b" : "#006241",
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
