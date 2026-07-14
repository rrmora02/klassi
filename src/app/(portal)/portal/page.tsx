"use client";

import { api } from "@/lib/trpc";
import { formatCurrency, formatDate, fullName } from "@/lib/utils";
import { PushOptIn } from "@/components/pwa/push-opt-in";
import { GraduationCap, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PortalHomePage() {
  const { data, isLoading } = api.portal.summary.useQuery();

  if (isLoading) {
    return <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", textAlign: "center", padding: "48px 0" }}>Cargando…</p>;
  }

  const students = data?.students ?? [];
  const payments = data?.pendingPayments ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
          Hola{data?.user.name ? `, ${data.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Este es el resumen de tu familia
        </p>
      </div>

      <PushOptIn />

      {/* Alumnos */}
      {students.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "40px 20px", textAlign: "center" }}>
          <GraduationCap size={28} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>
            Aún no hay alumnos vinculados a tu cuenta
          </p>
          <p style={{ fontSize: 12.5, color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>
            Pide a tu escuela que te envíe una invitación
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {students.map((student) => (
            <div key={student.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: student.tenant.primaryColor ?? "#1D3557", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 700,
                }}>
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                    {fullName(student.firstName, student.lastName)}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "1px 0 0" }}>
                    {student.tenant.name}
                  </p>
                </div>
              </div>
              {student.enrollments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {student.enrollments.map((enrollment) => (
                    <span key={enrollment.id} style={{
                      background: "rgba(29,53,87,0.07)", color: "#1D3557",
                      borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500,
                    }}>
                      {enrollment.group.discipline.name} · {enrollment.group.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagos pendientes */}
      {payments.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 0 8px" }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Pagos pendientes</h2>
            <Link href="/portal/pagos" style={{ fontSize: 12, color: "#1D3557", fontWeight: 600, textDecoration: "none" }}>Ver todos →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {payments.slice(0, 3).map((payment) => (
              <div key={payment.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={16} style={{ color: payment.status === "OVERDUE" ? "#dc2626" : "#b45309", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {payment.concept}
                  </p>
                  <p style={{ fontSize: 11.5, color: "var(--color-text-tertiary)", margin: "1px 0 0" }}>
                    {payment.student.firstName} · vence {formatDate(payment.dueDate)}
                  </p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: payment.status === "OVERDUE" ? "#dc2626" : "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
