"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { AttendanceStatus } from "@prisma/client";

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

  const StatusButton = ({ 
      enrId, label, val, color, currentStatus 
  }: { 
      enrId: string, label: string, val: AttendanceStatus, color: string, currentStatus?: AttendanceStatus 
  }) => {
      const isSelected = currentStatus === val;
      return (
        <button
          onClick={() => handleMark(enrId, val)}
          style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s",
            background: isSelected ? color : "transparent",
            color: isSelected ? "#fff" : "var(--color-text-secondary)",
            border: isSelected ? `1px solid ${color}` : "1px solid var(--color-border-secondary)",
          }}
        >
          {label}
        </button>
      )
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Pase de lista</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>Registra la asistencia en tiempo real.</p>
        </div>
      </div>

      <div style={{ background: "var(--color-background-primary)", padding: 20, borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", marginBottom: 24, display: "flex", gap: 20, alignItems: "center" }}>
         <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
           <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Fecha</label>
           <input
             type="date"
             value={dateStr}
             onChange={e => setDateStr(e.target.value)}
             className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:focus:border-violet-500 [color-scheme:light] dark:[color-scheme:dark]"
           />
         </div>

         <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 2 }}>
           <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Grupo a calificar</label>
           {loadingGroups ? (
              <div style={{ padding: "8px 12px", fontSize: 14 }}>Cargando grupos...</div>
           ) : (
              <select
                 value={groupId}
                 onChange={e => setGroupId(e.target.value)}
                 className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:focus:border-violet-500"
              >
                 <option value="">Seleccione un grupo...</option>
                 {groups?.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                 ))}
              </select>
           )}
         </div>
      </div>

      {!groupId && (
         <div style={{ padding: 60, textAlign: "center", color: "var(--color-text-tertiary)", border: "1px dashed var(--color-border-secondary)", borderRadius: 12 }}>
            Selecciona una fecha y grupo para desplegar la lista de alumnos.
         </div>
      )}

      {groupId && loadingRoster && (
         <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Generando lista...
         </div>
      )}

      {groupId && rosterData && (
         <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflowX: "auto" }}>
             <table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse" }}>
               <thead>
                 <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                   <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Alumno</th>
                   <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Estado para esta clase</th>
                 </tr>
               </thead>
               <tbody>
                  {rosterData.enrollments.length === 0 && (
                     <tr><td colSpan={2} style={{ textAlign: "center", padding: 40, color: "var(--color-text-tertiary)", fontSize: 13 }}>No hay alumnos inscritos en este grupo de momento.</td></tr>
                  )}
                  {rosterData.enrollments.map((enr) => (
                    <tr key={enr.enrollmentId} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                       <td style={{ padding: "12px 20px" }}>
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{enr.student.lastName} {enr.student.firstName}</span>
                       </td>
                       <td style={{ padding: "12px 20px", textAlign: "right" }}>
                           <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <StatusButton enrId={enr.enrollmentId} label="Presente" val="PRESENT" color="#10b981" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} label="Ausente" val="ABSENT" color="#ef4444" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} label="Retardo" val="LATE" color="#f59e0b" currentStatus={enr.attendance?.status} />
                              <StatusButton enrId={enr.enrollmentId} label="Justificado" val="JUSTIFIED" color="#64748b" currentStatus={enr.attendance?.status} />
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
