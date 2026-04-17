"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const inviteSchema = z.object({
  email: z.string().email("Correo inválido"),
  role:  z.enum(["ADMIN", "RECEPTIONIST"], { required_error: "Selecciona un rol" }),
});

type InviteValues = z.infer<typeof inviteSchema>;

interface Props {
  onSuccess: () => void;
}

export function InviteUserModal({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const invite = api.team.inviteMember.useMutation();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "RECEPTIONIST" },
  });

  const onSubmit = async (data: InviteValues) => {
    try {
      await invite.mutateAsync(data);
      alert("Invitación generada con éxito.");
      reset();
      setIsOpen(false);
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Error al generar invitación.");
    }
  };

  const inputStyle = (name: string, hasError?: boolean) => ({
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${hasError ? "var(--input-error-border)" : focused === name ? "var(--input-focus-border)" : "var(--input-border)"}`,
    outline: "none",
    fontSize: 13,
    background: "var(--input-bg)",
    color: "var(--input-text)",
    width: "100%",
    boxSizing: "border-box" as const,
    boxShadow: focused === name && !hasError ? "0 0 0 3px var(--input-focus-ring)" : hasError ? "0 0 0 3px var(--input-error-ring)" : "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    appearance: "none" as const,
  });

  const fb = (name: string) => ({
    onFocus: () => setFocused(name),
    onBlur:  () => setFocused(null),
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          color: "#fff", borderRadius: 8, padding: "9px 18px",
          fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
          boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        + Invitar al Equipo
      </button>

      {isOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 16,
          }}
        >
          <div
            className="r-modal-xs"
            style={{
              background: "#fff", width: 420, borderRadius: 16,
              padding: "28px 28px 24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              border: "1px solid var(--color-border-tertiary)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
                Invitar al Equipo
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", fontSize: 20, lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
                  Correo Electrónico
                </label>
                <input {...register("email")} {...fb("email")} type="email" style={inputStyle("email", !!errors.email)} placeholder="empleado@escuela.com" />
                {errors.email && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.email.message}</p>}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-text-tertiary)", marginBottom: 6 }}>
                  Puesto / Acceso
                </label>
                <select
                  {...register("role")}
                  {...fb("role")}
                  style={{
                    ...inputStyle("role", !!errors.role),
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 12px center",
                    paddingRight: 32,
                  }}
                >
                  <option value="RECEPTIONIST">Recepcionista</option>
                  <option value="ADMIN">Administrador Regional</option>
                </select>
                {errors.role && <p style={{ fontSize: 12, color: "var(--color-error)", marginTop: 4, margin: "4px 0 0" }}>{errors.role.message}</p>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
                    background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={invite.isLoading}
                  style={{
                    padding: "9px 18px", borderRadius: 8, border: "none",
                    background: invite.isLoading ? "var(--color-border-secondary)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    color: invite.isLoading ? "var(--color-text-tertiary)" : "#fff",
                    cursor: invite.isLoading ? "not-allowed" : "pointer",
                    fontSize: 13, fontWeight: 500,
                    boxShadow: invite.isLoading ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
                  }}
                >
                  {invite.isLoading ? "Procesando…" : "Generar Invitación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
