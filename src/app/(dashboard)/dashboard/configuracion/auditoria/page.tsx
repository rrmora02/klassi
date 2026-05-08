import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";
import { ErrorLogsTable } from "@/components/audit/error-logs-table";
import { BusinessEventsTable } from "@/components/audit/business-events-table";

interface PageProps {
  searchParams: { tab?: string; page?: string };
}

export default async function AuditoriaPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  const tab = searchParams.tab ?? "audit";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 50;

  const auditLogs = await db.auditLog.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const errorLogs = await db.errorLog.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const businessEvents = await db.businessEvent.findMany({
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const [auditTotal, errorTotal, eventTotal] = await Promise.all([
    db.auditLog.count(),
    db.errorLog.count(),
    db.businessEvent.count(),
  ]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          Auditoría y Logs
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Monitoreo de sistema, cambios y eventos
        </p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "0.5px solid var(--color-border-tertiary)", overflowX: "auto" }} className="scrollbar-hide">
        {[
          { label: "Auditoría", value: "audit", count: auditTotal },
          { label: "Errores", value: "errors", count: errorTotal },
          { label: "Eventos", value: "events", count: eventTotal },
        ].map(t => {
          const active = t.value === tab;
          return (
            <a
              key={t.value}
              href={`/dashboard/configuracion/auditoria?tab=${t.value}`}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                textDecoration: "none",
                whiteSpace: "nowrap",
                color: active ? "#006241" : "var(--color-text-secondary)",
                fontWeight: active ? 500 : 400,
                borderBottom: active ? "2px solid #006241" : "2px solid transparent",
                marginBottom: -1,
              }}
              className="sm:px-4 sm:text-sm"
            >
              {t.label} <span style={{ fontSize: 11 }}>{t.count}</span>
            </a>
          );
        })}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
        {tab === "audit" && <AuditLogsTable logs={auditLogs} />}
        {tab === "errors" && <ErrorLogsTable logs={errorLogs} />}
        {tab === "events" && <BusinessEventsTable events={businessEvents} />}
      </div>

      {[auditTotal, errorTotal, eventTotal][["audit", "errors", "events"].indexOf(tab)] > pageSize && (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="flex-wrap sm:flex-nowrap">
            {page > 1 && (
              <a
                href={`/dashboard/configuracion/auditoria?tab=${tab}&page=${page - 1}`}
                style={{
                  padding: "5px 12px",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                ← Anterior
              </a>
            )}
            <span style={{ padding: "5px 12px" }}>Página {page}</span>
            {[auditTotal, errorTotal, eventTotal][["audit", "errors", "events"].indexOf(tab)] > page * pageSize && (
              <a
                href={`/dashboard/configuracion/auditoria?tab=${tab}&page=${page + 1}`}
                style={{
                  padding: "5px 12px",
                  border: "0.5px solid var(--color-border-secondary)",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "var(--color-text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                Siguiente →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
