"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc";
import Link from "next/link";
import { StudentStatus } from "@prisma/client";
import { DeleteDialog } from "./delete-dialog";

interface Props {
  studentId:   string;
  studentName: string;
  status:      StudentStatus;
}

export function StudentActions({ studentId, studentName, status }: Props) {
  const router = useRouter();
  const [showMenu,   setShowMenu]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setStatus = api.students.setStatus.useMutation({
    onSuccess: () => { router.refresh(); setShowMenu(false); },
  });

  const deleteStudent = api.students.delete.useMutation({
    onSuccess: () => router.push("/dashboard/alumnos"),
    onError:   (e) => setDeleteError(e.message),
  });

  const statusOptions: { label: string; value: StudentStatus; }[] = [
    { label: "Activar",    value: "ACTIVE"    },
    { label: "Desactivar", value: "INACTIVE"  },
    { label: "Suspender",  value: "SUSPENDED" },
  ].filter(o => o.value !== status);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
        <Link
          href={`/dashboard/alumnos/${studentId}/editar`}
          style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "7px 16px", fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none", background: "var(--color-background-primary)" }}
        >
          Editar
        </Link>

        <button
          onClick={() => setShowMenu(m => !m)}
          style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-primary)", cursor: "pointer" }}
        >
          ···
        </button>

        {showMenu && (
          <div style={{ position: "absolute", top: "110%", right: 0, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: 6, minWidth: 160, zIndex: 50 }}>
            {statusOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatus.mutate({ id: studentId, status: opt.value })}
                disabled={setStatus.isPending}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, border: "none", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer", borderRadius: 6 }}
              >
                {opt.label}
              </button>
            ))}
            <div style={{ height: "0.5px", background: "var(--color-border-tertiary)", margin: "4px 0" }} />
            <button
              onClick={() => { setShowMenu(false); setShowDelete(true); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, border: "none", background: "transparent", color: "#dc2626", cursor: "pointer", borderRadius: 6 }}
            >
              Eliminar alumno
            </button>
          </div>
        )}
      </div>

      {/* Overlay de confirmación de borrado */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: 28, width: 420, maxWidth: "90vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff5f5", border: "0.5px solid #fca5a5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#dc2626", flexShrink: 0 }}>!</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Eliminar alumno</p>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Esta acción no se puede deshacer</p>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
              ¿Eliminar a <strong style={{ color: "var(--color-text-primary)" }}>{studentName}</strong>? Solo es posible si no tiene pagos ni inscripciones registradas. Si ya tiene historial, usa <em>Desactivar</em>.
            </p>

            {deleteError && (
              <div style={{ background: "#fff5f5", border: "0.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#c53030" }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowDelete(false); setDeleteError(null); }}
                disabled={deleteStudent.isPending}
                style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, padding: "8px 20px", fontSize: 13, background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteStudent.mutate({ id: studentId })}
                disabled={deleteStudent.isPending}
                style={{ background: deleteStudent.isPending ? "#94a3b8" : "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: deleteStudent.isPending ? "wait" : "pointer" }}
              >
                {deleteStudent.isPending ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
