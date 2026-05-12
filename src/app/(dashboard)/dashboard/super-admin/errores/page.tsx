import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { ErrorLogsList } from "@/components/errors/error-logs-list";

interface PageProps {
  searchParams: { severity?: string; resolved?: string; page?: string };
}

export default async function ErroresPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  const severity = searchParams.severity as any;
  const resolved = searchParams.resolved === "true";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 50;

  // Obtener resumen de errores
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const [summary, errorLogs] = await Promise.all([
    (async () => {
      const where = { createdAt: { gte: from } };
      const [critical, high, medium, low, total] = await Promise.all([
        db.errorLog.count({ where: { ...where, severity: "CRITICAL" } }),
        db.errorLog.count({ where: { ...where, severity: "HIGH" } }),
        db.errorLog.count({ where: { ...where, severity: "MEDIUM" } }),
        db.errorLog.count({ where: { ...where, severity: "LOW" } }),
        db.errorLog.count({ where }),
      ]);
      return { critical, high, medium, low, total };
    })(),
    db.errorLog.findMany({
      where: {
        ...(severity && { severity }),
        ...(searchParams.resolved !== undefined && { resolved }),
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalErrors = await db.errorLog.count({
    where: {
      ...(severity && { severity }),
      ...(searchParams.resolved !== undefined && { resolved }),
    },
  });

  const totalPages = Math.ceil(totalErrors / pageSize);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>
          Errores del Sistema
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
          Monitoreo y resolución de errores del sistema
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total (7 días)
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: "var(--color-text-primary)" }}>
            {summary.total}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Críticos
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: "#b91c1c" }}>
            {summary.critical}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Altos
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: "#dc2626" }}>
            {summary.high}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 12, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Medios
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, marginTop: 8, color: "#f59e0b" }}>
            {summary.medium}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a
          href="/dashboard/super-admin/errores"
          style={{
            padding: "8px 16px",
            borderRadius: 6,
            border: "0.5px solid var(--color-border-secondary)",
            textDecoration: "none",
            color: !severity && !searchParams.resolved ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            fontWeight: !severity && !searchParams.resolved ? 500 : 400,
            fontSize: 13,
          }}
        >
          Todos
        </a>
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(sev => (
          <a
            key={sev}
            href={`/dashboard/super-admin/errores?severity=${sev}`}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "0.5px solid var(--color-border-secondary)",
              textDecoration: "none",
              color: severity === sev ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: severity === sev ? 500 : 400,
              fontSize: 13,
            }}
          >
            {sev}
          </a>
        ))}
      </div>

      {/* Error List */}
      <ErrorLogsList logs={errorLogs as any} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 24, display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
          {page > 1 && (
            <a
              href={`/dashboard/super-admin/errores?page=${page - 1}`}
              style={{
                padding: "8px 12px",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: 6,
                textDecoration: "none",
                color: "var(--color-text-secondary)",
              }}
            >
              ← Anterior
            </a>
          )}
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/dashboard/super-admin/errores?page=${page + 1}`}
              style={{
                padding: "8px 12px",
                border: "0.5px solid var(--color-border-secondary)",
                borderRadius: 6,
                textDecoration: "none",
                color: "var(--color-text-secondary)",
              }}
            >
              Siguiente →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
