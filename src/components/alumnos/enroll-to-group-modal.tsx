"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { GroupLevelBadge } from "@/components/grupos/group-level-badge";

interface Props {
  studentId: string;
}

export function EnrollToGroupModal({ studentId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [groupId, setGroupId] = useState("");

  const { data: groups, isLoading } = api.enrollments.getGroupsAvailableForStudent.useQuery({ studentId }, { enabled: isOpen });
  const enroll = api.enrollments.enroll.useMutation();

  const handleClose = () => {
    setIsOpen(false);
    setGroupId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;

    try {
      await enroll.mutateAsync({ studentId, groupId, discount: 0 });
      router.refresh();
      handleClose();
    } catch (err: any) {
      alert(err.message || "Error al inscribir al alumno.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(99,102,241,0.3)",
          transition: "all 0.15s",
        }}
      >
        + Inscribir a grupo
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15,23,42,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              width: 520,
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  letterSpacing: "-0.01em",
                  margin: "0 0 6px",
                }}
              >
                Inscribir a Grupo
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                Selecciona el grupo al cual deseas añadir al alumno.
              </p>
            </div>

            {isLoading ? (
              <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", padding: "20px 0" }}>
                Cargando grupos disponibles...
              </p>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflowY: "auto",
                    paddingRight: 2,
                    paddingBottom: 4,
                  }}
                >
                  {groups?.map(g => {
                    const isSelected = groupId === g.id;
                    const isFull = g.isFull ?? false;

                    return (
                      <div
                        key={g.id}
                        onClick={() => !isFull && setGroupId(g.id)}
                        style={{
                          border: `1.5px solid ${isSelected ? "var(--input-focus-border)" : "var(--input-border)"}`,
                          borderRadius: 10,
                          padding: "12px 16px",
                          cursor: isFull ? "not-allowed" : "pointer",
                          background: isSelected
                            ? "var(--color-primary-light)"
                            : isFull
                            ? "var(--color-background-secondary)"
                            : "#fff",
                          opacity: isFull ? 0.55 : 1,
                          transition: "all 0.15s",
                          boxShadow: isSelected ? "0 0 0 3px var(--input-focus-ring)" : "none",
                        }}
                      >
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                               <span
                                 style={{
                                   fontSize: 11,
                                   fontWeight: 600,
                                   color: "#1d4ed8",
                                   padding: "2px 8px",
                                   background: "#eff6ff",
                                   borderRadius: 999,
                                   border: "1px solid #bfdbfe",
                                 }}
                               >
                                 {g.discipline.name}
                               </span>
                               <h3
                                 style={{
                                   fontSize: 14,
                                   fontWeight: 500,
                                   margin: "7px 0 4px",
                                   color: "var(--color-text-primary)",
                                 }}
                               >
                                 {g.name}
                               </h3>
                               <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                 <GroupLevelBadge level={g.level} />
                                 <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                                   {g.capacity - g._count.enrollments} cupos libres
                                 </span>
                               </div>
                            </div>
                            {isFull && (
                              <span
                                style={{
                                  fontSize: 11,
                                  color: "#b91c1c",
                                  fontWeight: 500,
                                  background: "#fef2f2",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  border: "1px solid #fecaca",
                                }}
                              >
                                Lleno
                              </span>
                            )}
                         </div>
                      </div>
                    );
                  })}

                  {groups?.length === 0 && (
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-tertiary)",
                        textAlign: "center",
                        padding: "28px 0",
                      }}
                    >
                      No hay más grupos disponibles.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                    paddingTop: 16,
                    borderTop: "1px solid var(--color-border-tertiary)",
                    marginTop: "auto",
                  }}
                >
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border-secondary)",
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!groupId || enroll.isLoading}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: (!groupId || enroll.isLoading)
                        ? "var(--color-border-secondary)"
                        : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      color: (!groupId || enroll.isLoading) ? "var(--color-text-tertiary)" : "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: (!groupId || enroll.isLoading) ? "not-allowed" : "pointer",
                      boxShadow: (!groupId || enroll.isLoading) ? "none" : "0 2px 8px rgba(99,102,241,0.35)",
                      transition: "all 0.15s",
                    }}
                  >
                    {enroll.isLoading ? "Guardando..." : "Confirmar Inscripción"}
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
