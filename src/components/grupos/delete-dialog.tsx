"use client";

interface DeleteDialogProps {
  groupName:  string;
  onConfirm:  () => void;
  onCancel:   () => void;
  isLoading?: boolean;
  error?:     string | null;
}

export function DeleteDialog({ groupName, onConfirm, onCancel, isLoading, error }: DeleteDialogProps) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#fff5f5", border: "0.5px solid #fca5a5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#dc2626", flexShrink: 0,
          }}>!</div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
              Eliminar grupo
            </p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
          ¿Eliminar el grupo <strong style={{ color: "var(--color-text-primary)" }}>{groupName}</strong>? Solo se puede eliminar si no tiene inscripciones registradas. Si ya tiene historial, usa <em>Desactivar</em>.
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
