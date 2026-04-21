"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { GroupLevelBadge } from "@/components/grupos/group-level-badge";

interface Props {
  studentId: string;
  currentEnrollmentId: string;
}

export function TransferGroupModal({ studentId, currentEnrollmentId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [groupId, setGroupId] = useState("");

  const { data: groups, isLoading } = api.enrollments.getGroupsAvailableForStudent.useQuery({ studentId }, { enabled: isOpen });
  const transfer = api.enrollments.transfer.useMutation();

  const handleClose = () => {
    setIsOpen(false);
    setGroupId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    try {
      await transfer.mutateAsync({ studentId, currentEnrollmentId, newGroupId: groupId });
      router.refresh();
      handleClose();
    } catch (err: any) {
      alert(err.message || "Error al transferir al alumno.");
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", cursor: "pointer", transition: "all 0.2s" }}
        onMouseOver={e => e.currentTarget.style.background = "#e2e8f0"}
        onMouseOut={e => e.currentTarget.style.background = "#f1f5f9"}
        title="Cambiar a otro grupo o nivel"
      >
        Transferir
      </button>

      {isOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
        }}>
          <div style={{
            background: "#ffffff", width: 500, borderRadius: 12, 
            padding: 24, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            maxHeight: "90vh", display: "flex", flexDirection: "column"
          }}>
            <div style={{ marginBottom: 16 }}>
               <h2 style={{ fontSize: 18, fontWeight: 500, margin: "0 0 4px" }}>Transferir de Grupo</h2>
               <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>La inscripción actual se marcará como &quot;Completada&quot; y se abrirá una nueva sin perder el historial.</p>
            </div>

            {isLoading ? (
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>Cargando grupos disponibles...</p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>
                
                <div style={{ 
                   display: "grid", gridTemplateColumns: "1fr", gap: 10, overflowY: "auto", paddingRight: 4, paddingBottom: 10
                }}>
                  {groups?.map(g => {
                    const isSelected = groupId === g.id;
                    const isFull = g.isFull ?? false;
                    
                    return (
                      <div 
                        key={g.id}
                        onClick={() => !isFull && setGroupId(g.id)}
                        style={{
                          border: `1.5px solid ${isSelected ? "#378ADD" : "var(--color-border-secondary)"}`,
                          borderRadius: 10, padding: "12px 16px",
                          cursor: isFull ? "not-allowed" : "pointer",
                          background: isSelected ? "#f0f7ff" : (isFull ? "#f8fafc" : "#fff"),
                          opacity: isFull ? 0.6 : 1, transition: "all 0.2s"
                        }}
                      >
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                               <span style={{ fontSize: 11, fontWeight: 600, color: "#006241", padding: "2px 8px", background: "#d4e9e2", borderRadius: 20 }}>
                                 {g.discipline.name}
                               </span>
                               <h3 style={{ fontSize: 14, fontWeight: 500, margin: "6px 0 4px", color: "var(--color-text-primary)" }}>{g.name}</h3>
                               <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                                 <GroupLevelBadge level={g.level} />
                                 <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Cupos libres: {g.capacity - g._count.enrollments}</span>
                               </div>
                            </div>
                            <div>
                               {isFull && <span style={{ fontSize: 11, color: "#e53e3e", fontWeight: 500, background: "#fff5f5", padding: "2px 6px", borderRadius: 4 }}>Lleno</span>}
                            </div>
                         </div>
                      </div>
                    )
                  })}
                  
                  {groups?.length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: 20 }}>
                      No hay más grupos disponibles.
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "0.5px solid var(--color-border-tertiary)", marginTop: "auto" }}>
                  <button type="button" onClick={handleClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer" }}>Cancelar</button>
                  <button type="submit" disabled={!groupId || transfer.isLoading} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#00754A", color: "#fff", cursor: (!groupId || transfer.isLoading) ? "not-allowed" : "pointer", opacity: (!groupId || transfer.isLoading) ? 0.7 : 1 }}>
                    {transfer.isLoading ? "Procesando..." : "Confirmar Transferencia"}
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
