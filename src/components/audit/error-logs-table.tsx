"use client";

import { formatDate } from "@/lib/utils";
import type { ErrorLog, LogSeverity } from "@prisma/client";

interface ErrorLogsTableProps {
  logs: ErrorLog[];
  onResolve?: (errorId: string) => void;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<LogSeverity, string> = {
  LOW: "#8b5cf6",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#b91c1c",
};

export function ErrorLogsTable({ logs, onResolve, isLoading }: ErrorLogsTableProps) {
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
        No hay errores registrados
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse" }} className="text-xs sm:text-sm">
        <thead>
          <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {["Severidad", "Tipo", "Mensaje", "Usuario", "Fecha", "Estado", ""].map(h => (
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
              <td style={{ padding: "8px 10px" }} className="sm:px-3.5 sm:py-2.5">
                <span
                  style={{
                    display: "inline-block",
                    background: SEVERITY_COLORS[log.severity] + "20",
                    color: SEVERITY_COLORS[log.severity],
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {log.severity}
                </span>
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                {log.errorType}
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-primary)", maxWidth: 300 }} className="sm:px-3.5 sm:py-2.5">
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.message}
                </span>
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                Sistema
              </td>
              <td style={{ padding: "8px 10px", color: "var(--color-text-secondary)", fontSize: 12 }} className="sm:px-3.5 sm:py-2.5">
                {formatDate(log.createdAt)}
              </td>
              <td style={{ padding: "8px 10px" }} className="sm:px-3.5 sm:py-2.5">
                <span
                  style={{
                    display: "inline-block",
                    background: log.resolved ? "#10b98120" : "#f5940e20",
                    color: log.resolved ? "#10b981" : "#f59e0b",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {log.resolved ? "Resuelto" : "Pendiente"}
                </span>
              </td>
              <td style={{ padding: "8px 10px", textAlign: "right" }} className="sm:px-3.5 sm:py-2.5">
                {!log.resolved && onResolve && (
                  <button
                    onClick={() => onResolve(log.id)}
                    style={{
                      padding: "4px 8px",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Resolver
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
