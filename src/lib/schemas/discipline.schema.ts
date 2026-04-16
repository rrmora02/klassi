import { z } from "zod";

export const disciplineFormSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(60, "Máximo 60 caracteres"),

  description: z
    .string()
    .max(300, "Máximo 300 caracteres")
    .optional()
    .or(z.literal("")),

  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Debe ser un código hexadecimal válido (ej: #FF0000)")
    .optional()
    .or(z.literal("")),

  isActive: z.boolean().default(true),
  
  // extraFieldsDef se omite para simplicidad en esta versión, tal como se mencionó en el plan.
});

export type DisciplineFormValues = z.infer<typeof disciplineFormSchema>;

export const disciplineFormDefaults: DisciplineFormValues = {
  name: "",
  description: "",
  color: "#1e40af", // un azul profundo por defecto
  isActive: true,
};
