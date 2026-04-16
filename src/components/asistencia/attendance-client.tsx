"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { AttendanceStatus } from "@prisma/client";

const inputBaseStyle: React.CSSProperties = {
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  background: "var(--input-bg)",
  color: "var(--input-text)",
  outline: "none",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

export function AttendanceClient() {
  const today = new Date().toISOString().split("T")[0];
  const [dateStr, setDateStr] = useState<string>(today);
  const [groupId, setGroupId] = useState<string>("");

  const { data: groups, isLoading: loadingGroups } = api.attendance.getGroups.useQuery();

  const { data: rosterData, isLoading: loadingRoster, refetch } = api.attendance.getSessionRoster.useQuery(
    { groupId, dateString: dateStr },
    { enabled: !!groupId && !!dateStr }
  );

  const markMutation = api.attendance.markAttendance.useMutation();

  const handleMark = async (enrollmentId: string, status: AttendanceStatus) => {
    if (!rosterData?.session?.id) return;

    // Optimizamos temporalmente local
    const ogRoster = rosterData;

    try {
        await markMutation.mutateAsync({
           sessionId: rosterData.session.id,
           enrollmentId,
           status,
        });
        // Refrescamos en background tras éxito
        refetch();
    } catch(err) {
        // En caso de fallo
        alert("Ocurrió un error al registrar la asistencia.");
    }
  };

  const statusConfig = {
    PRESENT:   { label: "Presente",    color: "#10b981", bg: "#ecfdf5", border: "#6ee7b7" },
    ABSENT:    { label: "Ausente",     color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
    LATE:      { label: "Retardo",     color: "#f59e0b", bg: "#fffbeb", border: "#fcd34d" },
    JUSTIFIED: { label: "Justificado", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
  };

  const StatusButton = ({
      enrId, val, currentStatus
  }: {
      enrId: string; val: AttendanceStatus; currentStatus?: AttendanceStatus;
  }) => {
      const isSelected = currentStatus === val;
      const cfg = statusConfig[val];
      return (
        <button
          onClick={() => handleMark(enrId, val)}
          style={{
            padding: "5px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            background: isSelected ? cfg.bg : "transparent",
            color: isSelected ? cfg.color : "var(--color-text-secondary)",
            border: isSelected ? `1.5px solid ${cfg.border}` : "1px solid var(--color-border-secondary)",
            boxShadow: isSelected ? `0 1px 4px ${cfg.color}20` : "none",
          }}
        >
          {cfg.label}
        </button>
      );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          Pase de lista
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
          Registra la asistencia en tiempo real.
        </p>
      </div>

      {/* Filtros */}
      <div
        style={{
          background: "var(--color-background-primary)",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid var(--color-border-tertiary)",
          marginBottom: 20,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          boxShadow: "var(--shadow-xs)",
        }}
      >
         <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
           <label
             style={{
               fontSize: 11,
               fontWeight: 600,
               color: "var(--color-text-tertiary)",
               textTransform: "uppercase",
               letterSpacing: "0.07em",
             }}
           >
             Fecha
           </label>
           <input
             type="date"
             value={dateStr}
             onChange={e => setDateStr(e.target.value)}
             style={{ ...inputBaseStyle, width: 160 }}
             onFocus={e => { e.target.style.borderColor = "var(--input-focus-border)"; e.target.style.boxShadow = "0 0 0 3px var(--input-focus-ring)"; }}
             onBlur={e => { e.target.style.borderColor = "var(--input-border)"; e.target.style.boxShadow = "none"; }}
           />
         </div>

         <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, maxWidth: 340 }}>
           <label
             style={{
               fontSize: 11,
               fontWeight: 600,
               color: "var(--color-text-tertiary)",
               textTransform: "uppercase",
               letterSpacing: "0.07em",
             }}
           >
             Grupo a calificar
           </label>
           {loadingGroups ? (
              <div style={{ ...inputBaseStyle, color: "var(--color-text-tertiary)" }}>Cargando grupos...</div>
           ) : (
              <select
                 value={groupId}
                 onChange={e => setGroupId(e.target.value)}
                 style={{
                   ...inputBaseStyle,
                   cursor: "pointer",
                   appearance: "none",
                   backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                   backgroundRepeat: "no-repeat",
                   backgroundPosition: "right 12px center",
                   paddingRight: 36,
                 }}
                 onFocus={e => { e.target.style.borderColor = "var(--input-focus-border)"; e.target.style.boxShadow = "0 0 0 3px var(--input-focus-ring)"; }}
                 onBlur={e => { e.target.style.borderColor = "var(--input-border)"; e.target.style.boxShadow = "none"; }}
              >
                 <option value="">Seleccione un grupo...</option>
                 {groups?.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                 ))}
              </select>
           )}
         </div>
      </div>

      {/* Empty state */}
      {!groupId && (
         <div
           style={{
             padding: 60,
             textAlign: "center",
             color: "var(--color-text-tertiary)",
             border: "1.5px dashed var(--color-border-secondary)",
             borderRadius: 12,
             fontSize: 13,
             background: "var(--color-background-secondary)",
           }}
         >
            Selecciona una fecha y grupo para desplegar la lista de alumnos.
         </div>
      )}

      {groupId && loadingRoster && (
         <div
           style={{
             padding: 48,
             textAlign: "center",
             color: "var(--color-text-secondary)",
             fontSize: 13,
           }}
         >
            Generando lista...
         </div>
      )}

      {/* Roster table */}
      {groupId && rosterData && (
         <div
           style={{
             background: "var(--color-background-primary)",
             border: "1px solid var(--color-border-tertiary)",
             borderRadius: 12,
             overflow: "hidden",
             boxShadow: "var(--shadow-xs)",
           }}
         >
             <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                 <tr
                   style={{
                     background: "var(--color-background-secondary)",
                     borderBottom: "1px solid var(--color-border-tertiary)",
                   }}
                 >
                   <th
                     style={{
                       padding: "12px 20px",
                       textAlign: "left",
                       fontSize: 11,
                       fontWeight: 600,
                       color: "var(--color-text-tertiary)",
                       textTransform: "uppercase",
                       letterSpacing: "0.07em",
                     }}
                   >
                     Alumno
                   </th>
                   <th
                     style={{
                       padding: "12px 20px",
                       textAlign: "right",
                       fontSize: 11,
                       fontWeight: 600,
                       color: "var(--color-text-tertiary)",
                       textTransform: "uppercase",
                       letterSpacing: "0.07em",
                     }}
                   >
                     Estado para esta clase
                   </th>
                 </tr>
               </thead>
               <tbody>
                  {rosterData.enrollments.length === 0 && (
                     <tr>
                       <td
                         colSpan={2}
                         style={{
                           textAlign: "center",
                           padding: 48,
                           color: "var(--color-text-tertiary)",
                           fontSize: 13,
                         }}
                       >
                         No hay alumnos inscritos en este grupo de momento.
                       </td>
                     </tr>
                  )}
                  {rosterData.enrollments.map((enr) => (
                    <tr
                      key={enr.enrollmentId}
                      style={{ borderBottom: "1px solid var(--color-border-tertiary)" }}
                    >
                       <td style={{ padding: "13px 20px" }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {enr.student.lastName} {enr.student.firstName}
                          </span>
                       </td>
                       <td style={{ padding: "13px 20px", textAlign: "right" }}>
                           <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              <StatusButton enrId={enr.enrollmentId} val="PRESENT" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} val="ABSENT" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} val="LATE" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} val="JUSTIFIED" currentStatus={enr.attendance?.status} />
                           </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
             </table>
         </div>
      )}

    </div>
  );
}
