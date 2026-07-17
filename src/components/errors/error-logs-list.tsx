"use client";

import { formatDate } from "@/lib/utils";
import type { ErrorLog, Tenant } from "@prisma/client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface ErrorLogsListProps {
  logs: (ErrorLog & { tenant?: Tenant | null })[];
  onResolve?: (errorId: string) => void;
  isLoading?: boolean;
}

const SEVERITY_COLORS = {
  CRITICAL: { bg: "#b91c1c", text: "#fecaca", label: "Crítico" },
  HIGH: { bg: "#dc2626", text: "#fca5a5", label: "Alto" },
  MEDIUM: { bg: "#f59e0b", text: "#fef3c7", label: "Medio" },
  LOW: { bg: "#8b5cf6", text: "#ede9fe", label: "Bajo" },
} as const;

export function ErrorLogsList({ logs, onResolve, isLoading }: ErrorLogsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-tertiary)" }}>
        Cargando errores...
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
      {logs.map(log => {
        const severityKey = log.severity as keyof typeof SEVERITY_COLORS;
        const severity = SEVERITY_COLORS[severityKey] ?? SEVERITY_COLORS.LOW;
        const isExpanded = expandedId === log.id;
        const context = log.context as Record<string, any> | null;

        return (
          <div
            key={log.id}
            style={{
              marginBottom: 16,
              border: `1px solid var(--color-border-tertiary)`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Error Header */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
              style={{
                padding: "16px",
                background: "var(--color-background-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <ChevronDown
                size={20}
                style={{
                  transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  transition: "transform 0.2s",
                  color: "var(--color-text-secondary)",
                }}
              />

              {/* Severity Badge */}
              <div
                style={{
                  display: "inline-block",
                  background: severity.bg + "20",
                  color: severity.bg,
                  padding: "4px 12px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  minWidth: 80,
                }}
              >
                {severity.label}
              </div>

              {/* Error Type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: 14 }}>
                  {log.errorType}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.message}
                </div>
              </div>

              {/* Date */}
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                {formatDate(log.createdAt)}
              </div>

              {/* Status */}
              <div>
                <span
                  style={{
                    display: "inline-block",
                    background: log.resolved ? "#10b98120" : "#f5940e20",
                    color: log.resolved ? "#10b981" : "#f59e0b",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {log.resolved ? "Resuelto" : "Pendiente"}
                </span>
              </div>
            </div>

            {/* Error Details */}
            {isExpanded && (
              <div style={{ padding: "16px", background: "var(--color-background-primary)", borderTop: "1px solid var(--color-border-tertiary)" }}>
                {context && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-primary)" }}>
                        📍 Ubicación del Error
                      </h4>
                      <div
                        style={{
                          background: "var(--color-background-secondary)",
                          padding: "12px",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        <div>
                          <strong>Archivo:</strong> {context.file}
                        </div>
                        <div>
                          <strong>Función:</strong> {context.function}
                        </div>
                        <div>
                          <strong>Línea:</strong> {context.line}:{context.column}
                        </div>
                        {context.fullPath && (
                          <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            <strong>Ruta completa:</strong>
                            <div style={{ marginTop: 4, wordBreak: "break-all" }}>
                              {context.fullPath}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-primary)" }}>
                        🔍 Contexto
                      </h4>
                      <div
                        style={{
                          background: "var(--color-background-secondary)",
                          padding: "12px",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {context.userId && (
                          <div>
                            <strong>Usuario:</strong> {context.userId}
                          </div>
                        )}
                        {context.tenantId && (
                          <div>
                            <strong>Escuela:</strong> {context.tenantId}
                          </div>
                        )}
                        {context.trpcPath && (
                          <div>
                            <strong>Endpoint:</strong> {context.trpcPath}
                          </div>
                        )}
                        {context.trpcType && (
                          <div>
                            <strong>Tipo:</strong> {context.trpcType}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {log.stack && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--color-text-primary)" }}>
                      📋 Stack Trace
                    </h4>
                    <pre
                      style={{
                        background: "#1f2937",
                        color: "#f3f4f6",
                        padding: "12px",
                        borderRadius: 6,
                        fontSize: 11,
                        overflow: "auto",
                        maxHeight: 300,
                      }}
                    >
                      {log.stack}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  {!log.resolved && onResolve && (
                    <button
                      onClick={() => onResolve(log.id)}
                      style={{
                        padding: "8px 16px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      Marcar como Resuelto
                    </button>
                  )}
                  {log.tenant && (
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      Escuela: <strong>{log.tenant.name}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
