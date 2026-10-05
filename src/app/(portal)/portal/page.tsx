"use client";

import Link from "next/link";
import { api } from "@/lib/trpc";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { PushOptIn } from "@/components/pwa/push-opt-in";
import { GraduationCap, ClipboardList, ChevronRight } from "lucide-react";
import { ActionLink, Card, EmptyState, PaymentStatus, Skeleton } from "@/components/shared";

// Inicio del portal: primero lo accionable (pase de lista del instructor, pagos
// por atender, invitación a activar avisos) y después la información de los
// alumnos (spec 001, RF-006).

export default function PortalHomePage() {
  const { data, isLoading } = api.portal.summary.useQuery();
  const { data: viewer }    = api.portal.viewer.useQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-14" />
        <Skeleton className="h-24" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  const students     = data?.students ?? [];
  const isInstructor = viewer?.isInstructor ?? false;
  const isParent     = viewer?.isParent ?? students.length > 0;

  // Vencidos primero; el resto en el orden de vencimiento que ya trae el servidor
  const payments = [...(data?.pendingPayments ?? [])].sort(
    (a, b) => Number(b.status === "OVERDUE") - Number(a.status === "OVERDUE"),
  );
  const manySchools = new Set(students.map((s) => s.tenant.name)).size > 1;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="m-0 text-xl font-semibold text-[var(--color-text-primary)]">
          Hola{data?.user.name ? `, ${data.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
          {isParent ? "Este es el resumen de tu familia." : "Este es tu resumen."}
        </p>
      </div>

      {/* 1 · Acceso rápido del instructor */}
      {isInstructor && (
        <Link
          href="/portal/asistencia"
          className="flex min-h-[64px] items-center gap-3 rounded-xl bg-[var(--brand)] p-4 text-[var(--brand-fg)] no-underline"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white/15">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Pase de lista</span>
            <span className="block text-sm opacity-90">Registra la asistencia de tus grupos</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {/* 2 · Pagos por atender */}
      {payments.length > 0 && (
        <section aria-labelledby="pagos-por-atender">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="pagos-por-atender" className="m-0 text-base font-semibold text-[var(--color-text-primary)]">
              Pagos por atender
            </h2>
            <ActionLink href="/portal/pagos" variant="ghost">Ver todos</ActionLink>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {payments.slice(0, 3).map((payment) => {
              const overdue = payment.status === "OVERDUE";
              return (
                <Card as="li" key={payment.id} danger={overdue}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{payment.concept}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{payment.student.firstName}</p>
                      <p className={`mt-0.5 text-xs ${overdue ? "font-semibold text-[var(--danger-fg)]" : "text-[var(--color-text-secondary)]"}`}>
                        {overdue ? "Venció" : "Vence"} {formatDate(payment.dueDate)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <p className="m-0 text-base font-bold tabular-nums text-[var(--color-text-primary)]">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                      <PaymentStatus status={payment.status} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </ul>
        </section>
      )}

      {/* 3 · Invitación a instalar la app / activar avisos */}
      <PushOptIn />

      {/* 4 · Alumnos */}
      {students.length === 0 ? (
        !isParent && isInstructor ? null : (
          <EmptyState
            icon={<GraduationCap size={28} />}
            title="Aún no hay alumnos vinculados a tu cuenta"
            message="Pide a tu escuela que te envíe una invitación."
          />
        )
      ) : (
        <section aria-labelledby="tus-alumnos">
          <h2 id="tus-alumnos" className="m-0 mb-2 text-base font-semibold text-[var(--color-text-primary)]">
            Tus alumnos
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {students.map((student) => (
              <Card as="li" key={student.id}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: student.tenant.primaryColor ?? "var(--brand)" }}
                    aria-hidden="true"
                  >
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="m-0 text-base font-semibold text-[var(--color-text-primary)]">
                      {fullName(student.firstName, student.lastName)}
                    </p>
                    {manySchools && (
                      <p className="m-0 text-xs text-[var(--color-text-secondary)]">{student.tenant.name}</p>
                    )}
                  </div>
                </div>
                {student.enrollments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {student.enrollments.map((enrollment) => {
                      const group = enrollment.group;
                      const label = group.name.toLowerCase().includes(group.discipline.name.toLowerCase())
                        ? group.name
                        : `${group.discipline.name} ${group.name}`;
                      return (
                        <span key={enrollment.id} className="portal-chip rounded-full px-2.5 py-1 text-xs font-medium">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </Card>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
