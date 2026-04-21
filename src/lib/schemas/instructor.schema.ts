import { z } from "zod";

export const instructorFormSchema = z.object({
  name: z
    .string()
    .min(2, "Mínimo 2 caracteres")
    .max(100, "Máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Solo se permiten letras"),

  email: z
    .string()
    .email("Correo inválido")
    .max(100), // En este caso exigimos el correo para ligar al usuario.

  phone: z
    .string()
    .regex(/^[\d\s\+\-\(\)]{7,20}$/, "Solo dígitos, espacios y caracteres +/- ( ) (7-20 caracteres)")
    .optional()
    .or(z.literal("")),

  bio: z
    .string()
    .max(500, "Máximo 500 caracteres")
    .optional()
    .or(z.literal("")),

  isActive: z.boolean().default(true),
});

export type InstructorFormValues = z.infer<typeof instructorFormSchema>;

export const instructorFormDefaults: InstructorFormValues = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  isActive: true,
};
