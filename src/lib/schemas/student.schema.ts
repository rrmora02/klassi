import { z } from "zod";

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
    .regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos")
    .optional()
    .or(z.literal("")),

  email: z
    .string()
    .email("Correo inválido")
    .max(100)
    .optional()
    .or(z.literal("")),

  // ── Tutor (requerido) ─────────────────────────────────────────────
  tutorName: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(120, "Máximo 120 caracteres"),

  tutorPhone: z
    .string()
    .regex(/^\d{10}$/, "El teléfono debe tener exactamente 10 dígitos"),

  tutorRelationship: z.enum(
    ["madre", "padre", "tutor", "abuelo", "otro"],
    { required_error: "Selecciona la relación con el alumno" }
  ),

  tutorEmail: z
    .string()
    .email("Correo del tutor inválido")
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

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
