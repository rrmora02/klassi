import { z } from "zod";

// ─── Schedule slot ────────────────────────────────────────────────

export const scheduleSlotSchema = z.object({
  day: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
}).refine((s) => s.startTime < s.endTime, {
  message: "La hora de fin debe ser mayor a la de inicio",
  path: ["endTime"],
});

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>;

// ─── Form schema ──────────────────────────────────────────────────

export const groupFormSchema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),

  disciplineId: z
    .string()
    .min(1, "Selecciona una disciplina"),

  instructorId: z
    .string()
    .optional()
    .or(z.literal("")),

  level: z.enum(
    ["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"],
    { required_error: "Selecciona un nivel" }
  ),

  type: z.enum(["FIXED", "PROGRESSIVE"], { required_error: "Selecciona el método" })
    .default("FIXED"),

  capacity: z
    .number({ invalid_type_error: "Ingresa un número" })
    .int("Debe ser un número entero")
    .min(1, "Mínimo 1 alumno")
    .max(200, "Máximo 200 alumnos"),

  room: z
    .string()
    .max(60, "Máximo 60 caracteres")
    .optional()
    .or(z.literal("")),

  schedule: z
    .array(scheduleSlotSchema)
    .min(1, "Agrega al menos un horario"),

  monthlyFee: z
    .number({ invalid_type_error: "Ingresa un monto válido" })
    .int("Debe ser entero")
    .min(0, "No puede ser negativo")
    .max(10_000_000, "Monto demasiado alto")
    .optional()
    .nullable(),

  billingDay: z
    .number({ invalid_type_error: "Ingresa un día válido" })
    .int("Debe ser entero")
    .min(1, "Mínimo día 1")
    .max(28, "Máximo día 28")
    .optional()
    .nullable(),
});

export type GroupFormValues = z.infer<typeof groupFormSchema>;

// ─── Defaults ─────────────────────────────────────────────────────

export const groupFormDefaults: GroupFormValues = {
  name:         "",
  disciplineId: "",
  instructorId: "",
  level:        "BEGINNER",
  type:         "FIXED",
  capacity:     20,
  room:         "",
  schedule:     [{ day: "MON", startTime: "", endTime: "" }],
  monthlyFee:   null,
  billingDay:   null,
};
