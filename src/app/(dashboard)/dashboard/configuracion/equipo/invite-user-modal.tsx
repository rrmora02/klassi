"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Toast } from "@/components/shared/toast";

const inviteSchema = z.object({
  email: z.string().email("Correo inválido"),
  role: z.enum(["ADMIN", "RECEPTIONIST", "INSTRUCTOR"], { required_error: "Selecciona un rol" }),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface Props {
  onSuccess: () => void;
}

export function InviteUserModal({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const invite = api.team.inviteMember.useMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "RECEPTIONIST" }
  });

  const onSubmit = async (data: InviteValues) => {
    try {
      const result = await invite.mutateAsync(data);
      setToast({ message: `Invitación enviada a ${data.email}. Válida por 7 días.`, type: "success" });
      reset();
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      setToast({ message: err.message || "Error al generar invitación.", type: "error" });
    }
  };

  const fieldStyle = { display: "flex", flexDirection: "column" as const, gap: 6, marginBottom: 16 };
  const labelStyle = { fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 };
  const inputCls = "w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-sb-light/40 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";
  const selectCls = "w-full appearance-none rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-sb-house text-gray-900 dark:text-gray-100 px-3.5 py-2.5 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors";

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <button
        onClick={() => setIsOpen(true)}
        style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#00754A", color: "#fff", cursor: "pointer", fontWeight: 500, fontSize: 14 }}
      >
        + Invitar al Equipo
      </button>

      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "var(--color-background-primary)", width: 400, borderRadius: 12, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>Invitar Miembro al Equipo</h2>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={fieldStyle}>
                <label style={labelStyle}>Correo Electrónico (El que usarán para entrar)</label>
                <input {...register("email")} className={inputCls} placeholder="empleado@escuela.com" />
                {errors.email && <span style={{ color: "#e53e3e", fontSize: 12 }}>{errors.email.message}</span>}
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Puesto / Acceso</label>
                <select {...register("role")} className={selectCls}>
                  <option value="RECEPTIONIST">Recepcionista</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ADMIN">Administrador Regional</option>
                </select>
                {errors.role && <span style={{ color: "#e53e3e", fontSize: 12 }}>{errors.role.message}</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setIsOpen(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" disabled={invite.isLoading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#00754A", color: "#fff", cursor: invite.isLoading ? "not-allowed" : "pointer" }}>
                  {invite.isLoading ? "Procesando..." : "Generar Invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
