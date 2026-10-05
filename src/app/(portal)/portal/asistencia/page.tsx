"use client";

import { useState } from "react";
import { api } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import type { AttendanceStatus } from "@prisma/client";
import { ClipboardList, ChevronLeft, ChevronRight, Check, X, Clock, MinusCircle, CheckCircle2 } from "lucide-react";
import { ActionButton, Card, EmptyState, Skeleton } from "@/components/shared";

// Pase de lista para instructores desde el portal (PWA).
// Solo ve sus grupos asignados (el router lo restringe también en servidor).
// Flujo: elige día → grupo → marca a cada alumno. Reutiliza attendance.*.

type Tone = "success" | "danger" | "warning" | "neutral";

const STATUSES: { val: AttendanceStatus; label: string; tone: Tone; icon: typeof Check }[] = [
  { val: "PRESENT",   label: "Presente",    tone: "success", icon: Check },
  { val: "ABSENT",    label: "Ausente",     tone: "danger",  icon: X },
  { val: "LATE",      label: "Tarde",       tone: "warning", icon: Clock },
  { val: "JUSTIFIED", label: "Justificado", tone: "neutral", icon: MinusCircle },
];

// Seleccionado: relleno + borde grueso del tono (no depende solo del color).
const ON: Record<Tone, string> = {
  success: "border-2 border-[var(--success-fg)] bg-[var(--success-bg)] text-[var(--success-fg)]",
  danger:  "border-2 border-[var(--danger-fg)] bg-[var(--danger-bg)] text-[var(--danger-fg)]",
  warning: "border-2 border-[var(--warning-fg)] bg-[var(--warning-bg)] text-[var(--warning-fg)]",
  neutral: "border-2 border-[var(--neutral-fg)] bg-[var(--neutral-bg)] text-[var(--neutral-fg)]",
};
const OFF = "border border-[var(--color-border-secondary)] bg-transparent text-[var(--color-text-secondary)]";

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export default function AsistenciaPage() {
  const { toast } = useToast();
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

  async function handleMark(enrollmentId: string, status: AttendanceStatus, studentName: string) {
    try {
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
    } catch {
      toast({
        title:       `No se guardó la asistencia de ${studentName}`,
        description: "Revisa tu conexión e intenta de nuevo.",
        variant:     "destructive",
      });
    }
  }

  // ── Vista de lista de un grupo ─────────────────────────────────
  if (groupId) {
    const selected = groups?.find((g) => g.id === groupId);
    const enrollments = roster?.enrollments ?? [];
    const total  = enrollments.length;
    const marked = enrollments.filter((e) => !!e.attendance?.status).length;
    const complete = total > 0 && marked === total;

    return (
      <div className="flex flex-col gap-3">
        <div>
          <ActionButton variant="ghost" onClick={() => setGroupId("")} className="-ml-3">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Grupos
          </ActionButton>
        </div>

        <div>
          <h1 className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">{selected?.name ?? "Pase de lista"}</h1>
          <p className="mt-0.5 text-sm first-letter:uppercase text-[var(--color-text-secondary)]">
            {new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date(dateStr + "T00:00:00"))}
          </p>
        </div>

        {/* Avance: cuántos alumnos llevo marcados */}
        {total > 0 && (
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--color-text-primary)]">{marked} de {total} marcados</span>
              {complete && (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--success-fg)]">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Lista completa
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-label="Avance del pase de lista"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={marked}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--neutral-bg)]"
            >
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-200 motion-reduce:transition-none"
                style={{ width: `${(marked / total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {loadingRoster ? (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando lista">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : total === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="No hay alumnos inscritos en este grupo"
            message="Cuando la escuela inscriba alumnos, aparecerán aquí."
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {enrollments.map((enr) => {
              const current = enr.attendance?.status as AttendanceStatus | undefined;
              const name = `${enr.student.lastName} ${enr.student.firstName}`;
              return (
                <Card as="li" key={enr.enrollmentId}>
                  <p className="m-0 mb-3 text-base font-semibold text-[var(--color-text-primary)]">{name}</p>
                  <div className="grid grid-cols-4 gap-1.5" role="group" aria-label={`Asistencia de ${name}`}>
                    {STATUSES.map(({ val, label, tone, icon: Icon }) => {
                      const on = current === val;
                      return (
                        <button
                          key={val}
                          type="button"
                          aria-pressed={on}
                          onClick={() => handleMark(enr.enrollmentId, val, name)}
                          className={
                            "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold " +
                            "transition-transform active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 " +
                            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-text)] " +
                            (on ? ON[tone] : OFF)
                          }
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  // ── Vista de selección de grupo ────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">Pase de lista</h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">Elige el día y tu grupo.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fecha-clase" className="text-sm font-medium text-[var(--color-text-primary)]">Fecha de la clase</label>
        <input
          id="fecha-clase"
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="min-h-12 rounded-xl border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] px-3 text-base text-[var(--color-text-primary)]"
        />
      </div>

      {loadingGroups ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando grupos">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (groups?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No tienes clases este día"
          message="Prueba con otra fecha."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {groups!.map((g) => (
            <Card as="li" key={g.id} padding="none">
              <button
                type="button"
                onClick={() => setGroupId(g.id)}
                className="flex min-h-[64px] w-full cursor-pointer items-center gap-3 rounded-xl bg-transparent p-4 text-left"
              >
                <span className="portal-icon-bubble flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]">
                  <ClipboardList size={18} className="portal-ico-announce" aria-hidden="true" />
                </span>
                <span className="flex-1 text-base font-semibold text-[var(--color-text-primary)]">{g.name}</span>
                <ChevronRight className="h-5 w-5 text-[var(--color-text-secondary)]" aria-hidden="true" />
              </button>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
