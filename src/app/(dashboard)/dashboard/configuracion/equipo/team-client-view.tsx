"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { InviteUserModal } from "./invite-user-modal";

export function TeamClientView() {
  const { data: members, isLoading: loadingMembers, refetch: refetchMembers } = api.team.getMembers.useQuery();
  const { data: invitations, isLoading: loadingInvites, refetch: refetchInvites } = api.team.getInvitations.useQuery();

  const revoke = api.team.revokeInvitation.useMutation();
  const remove = api.team.removeMember.useMutation();

  const handleRevoke = async (id: string) => {
    if (!confirm("¿Cancelar esta invitación?")) return;
    try {
      await revoke.mutateAsync({ id });
      refetchInvites();
    } catch (err: any) { alert(err.message); }
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de revocar el acceso de ${name}? Ya no podrá entrar al sistema.`)) return;
    try {
      await remove.mutateAsync({ id });
      refetchMembers();
    } catch (err: any) { alert(err.message); }
  };

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/aceptar-invitacion?token=${token}`;
    navigator.clipboard.writeText(link);
    alert("¡Link mágico copiado! Envíalo por WhatsApp al invitado para que se registre.");
  };

  const thStyle = { textAlign: "left" as const, padding: "12px 16px", borderBottom: "1px solid var(--color-border-tertiary)", fontSize: 13, color: "var(--color-text-secondary)", fontWeight: 500 };
  const tdStyle = { padding: "12px 16px", borderBottom: "1px solid var(--color-border-tertiary)", fontSize: 14, color: "var(--color-text-primary)" };

  return (
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
                  <span style={{ background: m.role === "ADMIN" ? "#d4e9e2" : (m.role === "INSTRUCTOR" ? "#fdf4ff" : "#f0fdf4"), color: m.role === "ADMIN" ? "#006241" : (m.role === "INSTRUCTOR" ? "#a21caf" : "#15803d"), padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
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
  );
}
