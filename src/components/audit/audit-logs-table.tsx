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

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Crear",
  UPDATE: "Actualizar",
  DELETE: "Eliminar",
  VIEW: "Ver",
  EXPORT: "Exportar",
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
            {["Usuario", "Descripción", "Entidad", "Fecha"].map(h => (
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
              <td style={{ padding: "8px 10px", color: "var(--color-text-primary)", fontWeight: 500, fontSize: 13 }} className="sm:px-3.5 sm:py-2.5">
                {log.user?.name ?? "Sistema"}
                {log.user?.email && (
                  <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                    {log.user.email}
                  </div>
                )}
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-primary)", maxWidth: 400 }} className="sm:px-3.5 sm:py-2.5">
                <span style={{ fontWeight: 500, display: "block" }}>
                  {log.description || `${log.action} ${log.entity}`}
                </span>
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
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
                  {ACTION_LABELS[log.action]}
                </span>
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                {formatDate(log.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
