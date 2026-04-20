"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";

interface Props {
  groupId: string;
}

export function EnrollStudentModal({ groupId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [studentId, setStudentId] = useState("");

  const { data, isLoading } = api.enrollments.getStudentsAvailableForGroup.useQuery({ groupId }, { enabled: isOpen });
  const enroll = api.enrollments.enroll.useMutation();

  const handleClose = () => {
    setIsOpen(false);
    setStudentId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      await enroll.mutateAsync({ studentId, groupId, discount: 0 });
      router.refresh();
      handleClose();
    } catch (err: any) {
      alert(err.message || "Error al inscribir alumno");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#5b21b6", color: "#fff", border: "none", cursor: "pointer", transition: "all 0.2s" }}
        onMouseOver={e => e.currentTarget.style.opacity = "0.9"}
        onMouseOut={e => e.currentTarget.style.opacity = "1"}
      >
        + Añadir alumno
      </button>

      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff", width: 440, borderRadius: 12, 
            padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 16px" }}>Añadir Alumno al Grupo</h2>
            {isLoading ? (
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Cargando alumnos disponibles...</p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {data?.isFull && (
               <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#991b1b", fontSize: 12, borderRadius: 6 }}>
                 Atención: Este grupo ya ha alcanzado su capacidad máxima ({data.enrolledCount}/{data.capacity}).
               </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--color-text-secondary)" }}>Selecciona un Alumno</label>
              <select 
                 value={studentId} 
                 onChange={e => setStudentId(e.target.value)}
                 style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", outline: "none", fontSize: 14, background: "#fff" }}
                 required
              >
                <option value="">Buscar estudiante...</option>
                {data?.students.map(s => (
                   <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>
                ))}
              </select>
              {data?.students.length === 0 && (
                <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  No hay alumnos disponibles (todos están inactivos o ya inscritos).
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button type="button" onClick={handleClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={!studentId || enroll.isLoading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#5b21b6", color: "#fff", cursor: (!studentId || enroll.isLoading) ? "not-allowed" : "pointer", opacity: (!studentId || enroll.isLoading) ? 0.7 : 1 }}>
                {enroll.isLoading ? "Guardando..." : "Inscribir Alumno"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
   )}
  </>
  );
}
