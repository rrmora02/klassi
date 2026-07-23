"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import type { AttendanceStatus } from "@prisma/client";
import { ClipboardList, ChevronLeft, Check, X, Clock, MinusCircle } from "lucide-react";

// Pase de lista para instructores desde el portal (PWA).
// Solo ve sus grupos asignados (el router lo restringe también en servidor).
// Flujo: elige día → grupo → marca a cada alumno. Reutiliza attendance.*.

const STATUSES: { val: AttendanceStatus; label: string; color: string; icon: typeof Check }[] = [
  { val: "PRESENT",   label: "Presente",    color: "#10b981", icon: Check },
  { val: "ABSENT",    label: "Ausente",     color: "#ef4444", icon: X },
  { val: "LATE",      label: "Tarde",       color: "#f59e0b", icon: Clock },
  { val: "JUSTIFIED", label: "Justificado", color: "#64748b", icon: MinusCircle },
];

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export default function AsistenciaPage() {
  const [dateStr, setDateStr] = useState(todayStr());
  const [groupId, setGroupId] = useState<string>("");

  const { data: groups, isLoading: loadingGroups } = api.attendance.getGroups.useQuery({ dateString: dateStr });
  const utils = api.useUtils();

  const { data: roster, isLoading: loadingRoster } = api.attendance.getSessionRoster.useQuery(
    { groupId, dateString: dateStr },
    { enabled: !!groupId && !!dateStr },
  );

  const createSession = api.attendance.createSession.useMutation();
  const mark = api.attendance.markAttendance.useMutation({
    onMutate: async (vars) => {
      const key = { groupId, dateString: dateStr };
      const prev = utils.attendance.getSessionRoster.getData(key);
      if (prev) {
        utils.attendance.getSessionRoster.setData(key, {
          ...prev,
          enrollments: prev.enrollments.map((e) =>
            e.enrollmentId === vars.enrollmentId
              ? { ...e, attendance: { ...(e.attendance as object), status: vars.status } as typeof e.attendance }
              : e,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.attendance.getSessionRoster.setData({ groupId, dateString: dateStr }, ctx.prev);
    },
  });

  async function handleMark(enrollmentId: string, status: AttendanceStatus) {
    let sessionId = roster?.session?.id;
    if (!sessionId) {
      const s = await createSession.mutateAsync({ groupId, dateString: dateStr });
      sessionId = s.id;
      utils.attendance.getSessionRoster.setData(
        { groupId, dateString: dateStr },
        (old) => (old ? { ...old, session: s } : old),
      );
    }
    await mark.mutateAsync({ sessionId, enrollmentId, status });
  }

  // ── Vista de lista de un grupo ─────────────────────────────────
  if (groupId) {
    const selected = groups?.find((g) => g.id === groupId);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={() => setGroupId("")}
          className="portal-accent-text"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", padding: 0, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <ChevronLeft size={16} /> Grupos
        </button>

        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
            {selected?.name ?? "Pase de lista"}
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(dateStr + "T00:00:00"))}
          </p>
        </div>

        {loadingRoster ? (
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "40px 0" }}>Cargando lista…</p>
        ) : (roster?.enrollments.length ?? 0) === 0 ? (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>No hay alumnos inscritos en este grupo</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {roster!.enrollments.map((enr) => {
              const current = enr.attendance?.status as AttendanceStatus | undefined;
              return (
                <div key={enr.enrollmentId} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 10px" }}>
                    {enr.student.lastName} {enr.student.firstName}
                  </p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {STATUSES.map(({ val, label, color, icon: Icon }) => {
                      const on = current === val;
                      return (
                        <button
                          key={val}
                          onClick={() => handleMark(enr.enrollmentId, val)}
                          aria-label={label}
                          style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                            padding: "8px 0", borderRadius: 9, cursor: "pointer",
                            background: on ? color : "transparent",
                            color: on ? "#fff" : "var(--color-text-secondary)",
                            border: `1px solid ${on ? color : "var(--color-border-secondary)"}`,
                            fontSize: 10, fontWeight: 600,
                          }}
                        >
                          <Icon size={16} /> {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Vista de selección de grupo ────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Pase de lista</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>Elige el día y tu grupo</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>Fecha</label>
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          style={{
            background: "var(--color-background-primary)", color: "var(--color-text-primary)",
            border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 12px", fontSize: 14,
          }}
        />
      </div>

      {loadingGroups ? (
        <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "32px 0" }}>Cargando grupos…</p>
      ) : (groups?.length ?? 0) === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
          <ClipboardList size={26} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
          <p style={{ fontSize: 13.5, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>No tienes clases este día</p>
          <p style={{ fontSize: 12.5, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>Prueba con otra fecha</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {groups!.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer",
                background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12, padding: "14px 16px", width: "100%",
              }}
            >
              <span className="portal-icon-bubble" style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ClipboardList size={17} className="portal-ico-announce" />
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{g.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
