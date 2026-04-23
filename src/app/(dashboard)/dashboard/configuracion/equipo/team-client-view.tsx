"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { InviteUserModal } from "./invite-user-modal";
import { Toast } from "@/components/shared/toast";

export function TeamClientView() {
  const { data: members, isLoading: loadingMembers, refetch: refetchMembers } = api.team.getMembers.useQuery();
  const { data: invitations, isLoading: loadingInvites, refetch: refetchInvites } = api.team.getInvitations.useQuery();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; action: () => void } | null>(null);

  const revoke = api.team.revokeInvitation.useMutation();
  const remove = api.team.removeMember.useMutation();

  const handleRevoke = async (id: string) => {
    setConfirmDialog({
      message: "¿Cancelar esta invitación?",
      action: async () => {
        try {
          await revoke.mutateAsync({ id });
          setToast({ message: "Invitación cancelada", type: "success" });
          refetchInvites();
        } catch (err: any) {
          setToast({ message: err.message || "Error al cancelar", type: "error" });
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleRemove = async (id: string, name: string) => {
    setConfirmDialog({
      message: `¿Estás seguro de revocar el acceso de ${name}? Ya no podrá entrar al sistema.`,
      action: async () => {
        try {
          await remove.mutateAsync({ id });
          setToast({ message: "Usuario removido del equipo", type: "success" });
          refetchMembers();
        } catch (err: any) {
          setToast({ message: err.message || "Error al remover", type: "error" });
        }
        setConfirmDialog(null);
      }
    });
  };

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/aceptar-invitacion?token=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setToast({ message: "¡Link copiado! Envíalo al invitado para que se registre.", type: "success" });
    }).catch(() => {
      setToast({ message: "Error al copiar el link", type: "error" });
    });
  };

  const thStyle = { textAlign: "left" as const, padding: "12px 16px", borderBottom: "1px solid var(--color-border-tertiary)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 };
  const tdStyle = { padding: "12px 16px", borderBottom: "1px solid var(--color-border-tertiary)", fontSize: 14, color: "var(--color-text-primary)" };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {confirmDialog && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "var(--color-background-primary)", borderRadius: 12, padding: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxWidth: 400
          }}>
            <p style={{ fontSize: 16, margin: "0 0 20px", color: "var(--color-text-primary)" }}>{confirmDialog.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDialog.action}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#e53e3e", color: "#fff", cursor: "pointer" }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    <div style={{ display: "grid", gap: 32 }}>

      {/* Acciones Generales */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <InviteUserModal onSuccess={() => refetchInvites()} />
      </div>

      {/* Miembros Activos */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Usuarios Activos</h2>
        </div>
        <table style={{ width: "100%", minWidth: 500, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre / Correo</th>
              <th style={thStyle}>Rol de Accesos</th>
              <th style={thStyle}>Agregado</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {loadingMembers ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)" }}>Cargando usuarios...</td></tr>
            ) : members?.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)" }}>No hay usuarios extra en el equipo.</td></tr>
            ) : members?.map(m => (
              <tr key={m.id}>
                <td style={tdStyle}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{m.user.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{m.user.email}</p>
                </td>
                <td style={tdStyle}>
                  <span style={{ background: m.role === "ADMIN" ? "#d4e9e2" : (m.role === "INSTRUCTOR" ? "rgba(0,117,74,0.12)" : "#f0fdf4"), color: m.role === "ADMIN" ? "#006241" : (m.role === "INSTRUCTOR" ? "#00754A" : "#15803d"), padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                    {m.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  {formatDate(m.createdAt)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button 
                    onClick={() => handleRemove(m.id, m.user.name ?? "Usuario")}
                    style={{ background: "transparent", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
                  >
                    Revocar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invitaciones Pendientes */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>Invitaciones Pendientes ⏳</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-secondary)" }}>Usuarios que no han aceptado el Link o no han creado su cuenta.</p>
        </div>
        <table style={{ width: "100%", minWidth: 500, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Correo Invitado</th>
              <th style={thStyle}>Rol Propuesto</th>
              <th style={thStyle}>Caduca</th>
              <th style={thStyle}>Link Mágico</th>
            </tr>
          </thead>
          <tbody>
            {loadingInvites ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)" }}>Cargando invitaciones...</td></tr>
            ) : invitations?.length === 0 ? (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)" }}>No hay invitaciones pendientes.</td></tr>
            ) : invitations?.map(inv => (
              <tr key={inv.id}>
                <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.email}</td>
                <td style={tdStyle}>{inv.role}</td>
                <td style={tdStyle}>{formatDate(inv.expiresAt)}</td>
                <td style={{ ...tdStyle }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <button 
                      onClick={() => copyToClipboard(inv.token)}
                      style={{ padding: "6px 12px", background: "#00754A", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, cursor: "pointer" }}
                    >
                      Copiar Link
                    </button>
                    <button 
                      onClick={() => handleRevoke(inv.id)}
                      style={{ background: "transparent", border: "none", color: "#e53e3e", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
    </>
  );
}
