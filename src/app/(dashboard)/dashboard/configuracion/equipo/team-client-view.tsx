"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { formatDate } from "@/lib/utils";
import { InviteUserModal } from "./invite-user-modal";

const roleConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  ADMIN:        { label: "Admin",         bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  INSTRUCTOR:   { label: "Instructor",    bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe" },
  RECEPTIONIST: { label: "Recepcionista", bg: "#f0fdf4", color: "#065f46", border: "#a7f3d0" },
};

export function TeamClientView() {
  const { data: members,     isLoading: loadingMembers, refetch: refetchMembers }   = api.team.getMembers.useQuery();
  const { data: invitations, isLoading: loadingInvites, refetch: refetchInvites }   = api.team.getInvitations.useQuery();

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
    if (!confirm(`¿Revocar el acceso de ${name}? Ya no podrá entrar al sistema.`)) return;
    try {
      await remove.mutateAsync({ id });
      refetchMembers();
    } catch (err: any) { alert(err.message); }
  };

  const copyToClipboard = (token: string) => {
    const link = `${window.location.origin}/aceptar-invitacion?token=${token}`;
    navigator.clipboard.writeText(link);
    alert("¡Link mágico copiado! Envíalo por WhatsApp al invitado.");
  };

  const cardStyle = {
    background: "#fff",
    border: "1px solid var(--color-border-tertiary)",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "var(--shadow-xs)",
  };

  const thStyle = {
    padding: "11px 16px", textAlign: "left" as const,
    fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
    letterSpacing: "0.07em", color: "var(--color-text-tertiary)",
  };

  const tdStyle = {
    padding: "12px 16px",
    borderBottom: "1px solid var(--color-border-tertiary)",
    fontSize: 13, color: "var(--color-text-primary)",
  };

  return (
    <div style={{ display: "grid", gap: 24 }}>

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <InviteUserModal onSuccess={() => refetchInvites()} />
      </div>

      {/* Usuarios Activos */}
      <div style={cardStyle}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
            Usuarios Activos
          </h2>
        </div>
        <div className="r-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                <th style={thStyle}>Nombre / Correo</th>
                <th style={thStyle}>Rol</th>
                <th className="r-hide-xs" style={thStyle}>Agregado</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {loadingMembers ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)", padding: "40px 0" }}>Cargando usuarios…</td></tr>
              ) : members?.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)", padding: "40px 0" }}>No hay usuarios extra en el equipo.</td></tr>
              ) : members?.map(m => {
                const role = roleConfig[m.role] ?? roleConfig.RECEPTIONIST;
                return (
                  <tr key={m.id}>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: "var(--color-primary-light)", color: "var(--color-primary)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 600, flexShrink: 0,
                          border: "1px solid rgba(99,102,241,0.15)",
                        }}>
                          {(m.user.name ?? "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: 13, color: "var(--color-text-primary)" }}>{m.user.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: role.bg, color: role.color, border: `1px solid ${role.border}`, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                        {role.label}
                      </span>
                    </td>
                    <td className="r-hide-xs" style={{ ...tdStyle, color: "var(--color-text-secondary)" }}>
                      {formatDate(m.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>
                      <button
                        onClick={() => handleRemove(m.id, m.user.name ?? "Usuario")}
                        style={{
                          padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca",
                          background: "#fef2f2", color: "#b91c1c", cursor: "pointer",
                          fontSize: 12, fontWeight: 500,
                        }}
                      >
                        Revocar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitaciones Pendientes */}
      <div style={cardStyle}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border-tertiary)", background: "var(--color-warning-bg)" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-warning-text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>⏳</span> Invitaciones Pendientes
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-warning-text)", opacity: 0.75 }}>
            Usuarios que aún no han aceptado la invitación.
          </p>
        </div>
        <div className="r-table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-tertiary)" }}>
                <th style={thStyle}>Correo Invitado</th>
                <th style={thStyle}>Rol</th>
                <th className="r-hide-xs" style={thStyle}>Caduca</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingInvites ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)", padding: "40px 0" }}>Cargando invitaciones…</td></tr>
              ) : invitations?.length === 0 ? (
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "var(--color-text-tertiary)", padding: "40px 0" }}>No hay invitaciones pendientes.</td></tr>
              ) : invitations?.map(inv => {
                const role = roleConfig[inv.role] ?? roleConfig.RECEPTIONIST;
                return (
                  <tr key={inv.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{inv.email}</td>
                    <td style={tdStyle}>
                      <span style={{ background: role.bg, color: role.color, border: `1px solid ${role.border}`, padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                        {role.label}
                      </span>
                    </td>
                    <td className="r-hide-xs" style={{ ...tdStyle, color: "var(--color-text-secondary)" }}>
                      {formatDate(inv.expiresAt)}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button
                          onClick={() => copyToClipboard(inv.token)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.2)",
                            background: "var(--color-primary-light)", color: "var(--color-primary)",
                            cursor: "pointer", fontSize: 12, fontWeight: 500,
                          }}
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca",
                            background: "#fef2f2", color: "#b91c1c", cursor: "pointer",
                            fontSize: 12, fontWeight: 500,
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
