"use client";

interface DeleteDialogProps {
  studentName: string;
  onConfirm:   () => void;
  onCancel:    () => void;
  isLoading?:  boolean;
  error?:      string | null;
}

export function DeleteDialog({ studentName, onConfirm, onCancel, isLoading, error }: DeleteDialogProps) {
  return (
    <div style={{
      minHeight: 320,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "var(--border-radius-lg)",
      padding: 24,
    }}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: 28,
        width: "100%",
        maxWidth: 400,
      }}>
        {/* Icono de advertencia */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#fff5f5", border: "0.5px solid #fca5a5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#dc2626", flexShrink: 0,
          }}>!</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
              Eliminar alumno
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
          ¿Estás seguro de que deseas eliminar a <strong style={{ color: "var(--color-text-primary)" }}>{studentName}</strong>? Solo se puede eliminar si no tiene pagos ni inscripciones registradas.
        </p>

        {error && (
          <div style={{
            background: "#fff5f5", border: "0.5px solid #fca5a5",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            fontSize: 13, color: "#c53030",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              border: "0.5px solid var(--color-border-secondary)", borderRadius: 8,
              padding: "8px 20px", fontSize: 13, background: "transparent",
              color: "var(--color-text-secondary)", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              background: isLoading ? "#94a3b8" : "#dc2626",
              color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 20px", fontSize: 13, fontWeight: 500,
              cursor: isLoading ? "wait" : "pointer",
            }}
          >
            {isLoading ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
