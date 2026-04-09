import { z } from "zod";

// ─── Schema base ──────────────────────────────────────────────────
// Se usa en el formulario (client) y en el router (server).
// Centralizar aquí evita duplicar validaciones.

export const studentFormSchema = z.object({
  firstName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Solo se permiten letras"),

  lastName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(60, "Máximo 60 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Solo se permiten letras"),

  birthDate: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Fecha inválida")
    .refine((v) => !v || new Date(v) <= new Date(), "No puede ser fecha futura")
    .optional(),

  gender: z.enum(["M", "F", "otro"]).optional(),

  phone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]{7,20}$/, "Teléfono inválido")
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .email("Correo inválido")
    .max(100)
    .optional()
    .or(z.literal("")),

  tutorName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres")
    .optional()
    .or(z.literal("")),

  tutorPhone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]{7,20}$/, "Teléfono del tutor inválido")
    .optional()
    .or(z.literal("")),

  tutorEmail: z
    .string()
    .email("Correo del tutor inválido")
    .optional()
    .or(z.literal("")),

  tutorRelationship: z
    .enum(["madre", "padre", "tutor", "abuelo", "otro"])
    .optional(),

  notes: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

// Valores por defecto para el formulario en blanco
export const studentFormDefaults: StudentFormValues = {
  firstName:         "",
  lastName:          "",
  birthDate:         "",
  gender:            undefined,
  phone:             "",
  email:             "",
  tutorName:         "",
  tutorPhone:        "",
  tutorEmail:        "",
  tutorRelationship: undefined,
  notes:             "",
};
