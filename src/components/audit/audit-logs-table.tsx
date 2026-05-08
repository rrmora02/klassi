"use client";

import { formatDate } from "@/lib/utils";
import type { AuditLog, User } from "@prisma/client";

interface AuditLogsTableProps {
  logs: (AuditLog & { user: User | null })[];
  isLoading?: boolean;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "#10b981",
  UPDATE: "#3b82f6",
  DELETE: "#ef4444",
  VIEW: "#8b5cf6",
  EXPORT: "#f59e0b",
};

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
        Cargando...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
        No hay registros de auditoría
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }} className="text-xs sm:text-sm">
        <thead>
          <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Usuario", "Acción", "Entidad", "ID", "Fecha", "Detalles"].map(h => (
              <th
                key={h}
                style={{
                  padding: "8px 10px",
                  textAlign: "left",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                }}
                className="sm:px-3.5 sm:py-2.5"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <td style={{ padding: "8px 10px", color: "var(--color-text-primary)" }} className="sm:px-3.5 sm:py-2.5">
                <span style={{ fontWeight: 500 }}>{log.user?.name ?? "—"}</span>
                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  {log.user?.email}
                </div>
              </td>
              <td style={{ padding: "8px 10px" }} className="sm:px-3.5 sm:py-2.5">
                <span
                  style={{
                    display: "inline-block",
                    background: ACTION_COLORS[log.action] + "20",
                    color: ACTION_COLORS[log.action],
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {log.action}
                </span>
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)" }} className="sm:px-3.5 sm:py-2.5">
                {log.entity}
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 11 }} className="sm:px-3.5 sm:py-2.5">
                {log.entityId.slice(0, 8)}...
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                {formatDate(log.createdAt)}
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 11 }} className="sm:px-3.5 sm:py-2.5">
                {log.oldValues && log.newValues ? "Modificado" : log.action === "CREATE" ? "Creado" : log.action === "DELETE" ? "Eliminado" : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
