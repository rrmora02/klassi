import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { fullName, calcAge } from "@/lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { StudentRow } from "@/components/alumnos/student-row";
import { StudentTable } from "@/components/alumnos/student-table";

interface PageProps {
  searchParams: { q?: string; status?: string; disc?: string; page?: string; };
}

async function StudentTableSection({ students, pages, page, pageSize, total, buildUrl }: any) {
  return (
    <>
      {/* Tabla */}
      <StudentTable students={students} StudentRow={StudentRow} />

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <p style={{ margin: "0 0 12px" }}>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</p>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }} className="flex-wrap sm:flex-nowrap">
            {page > 1 && <Link href={buildUrl({ page: String(page - 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>← Ant</Link>}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl({ page: String(p) })} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#006241" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{p}</Link>
            ))}
            {page < pages && <Link href={buildUrl({ page: String(page + 1) })} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>Sig →</Link>}
          </div>
        </div>
      )}
    </>
  );
}

export default async function AlumnosPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Proteger acceso: solo ADMIN y RECEPTIONIST
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role === "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const page     = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 10;
  const search   = searchParams.q?.trim() ?? "";
  const status   = searchParams.status as "ACTIVE" | "INACTIVE" | "SUSPENDED" | undefined;
  const discId   = searchParams.disc;

  const where: any = {
    tenantId: tenant.id,
    ...(status && { status }),
    ...(search && { OR: [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName:  { contains: search, mode: "insensitive" } },
      { email:     { contains: search, mode: "insensitive" } },
      { phone:     { contains: search } },
      { parents: { some: { user: { name: { contains: search, mode: "insensitive" } } } } },
    ]}),
    ...(discId && { enrollments: { some: { status: "ACTIVE", group: { disciplineId: discId } } } }),
  };

  // Fetch data in parallel
  const [students, total, disciplines, counts] = await Promise.all([
    db.student.findMany({
      where, skip: (page - 1) * pageSize, take: pageSize,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        email: true,
        phone: true,
        status: true,
        enrollments: {
          where: { status: "ACTIVE" },
          take: 3,
          include: { group: { include: { discipline: true } } }
        },
        parents: {
          take: 2,
          include: { user: true },
          orderBy: { isPrimary: "desc" }
        }
      }
    }),
    db.student.count({ where }),
    db.discipline.findMany({ where: { tenantId: tenant.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.student.groupBy({ by: ["status"], where: { tenantId: tenant.id }, _count: true }),
  ]);

  const pages    = Math.ceil(total / pageSize);
  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count]));

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { q: search || undefined, status, disc: discId, ...params };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    return `/dashboard/alumnos?${sp.toString()}`;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 16, paddingRight: 16 }} className="lg:px-0">
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <span>Alumnos</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Alumnos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{total} {total === 1 ? "alumno" : "alumnos"}</p>
        </div>
        <Link href="/dashboard/alumnos/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
          + Nuevo alumno
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", overflowX: "auto" }} className="scrollbar-hide">
        {[
          { label: "Todos", value: undefined, count: Object.values(countMap).reduce((a: number, b: number) => a + b, 0) },
          { label: "Activos", value: "ACTIVE", count: countMap.ACTIVE ?? 0 },
          { label: "Inactivos", value: "INACTIVE", count: countMap.INACTIVE ?? 0 },
        ].map(tab => {
          const active = tab.value === status || (!tab.value && !status);
          return (
            <Link key={tab.label} href={buildUrl({ status: tab.value, page: "1" })} style={{
              padding: "8px 12px", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap",
              color: active ? "#006241" : "var(--color-text-secondary)",
              fontWeight: active ? 500 : 400,
              borderBottom: active ? "2px solid #006241" : "2px solid transparent",
              marginBottom: -1,
            }} className="sm:px-4 sm:text-sm">
              {tab.label} <span style={{ fontSize: 11 }}>{tab.count}</span>
            </Link>
          );
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <form style={{ flex: 1, minWidth: 200 }} className="sm:max-w-sm">
          <input name="q" defaultValue={search} placeholder="Buscar alumno o tutor..." className="w-full rounded-lg border border-gray-200 dark:border-[rgba(255,255,255,0.20)] bg-white dark:bg-[rgba(255,255,255,0.08)] text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 px-3.5 py-2 text-sm outline-none focus:border-sb-accent dark:focus:border-sb-accent transition-colors" />
        </form>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ id: undefined, name: "Todas" }, ...disciplines].map(d => (
            <Link key={d.id ?? "all"} href={buildUrl({ disc: d.id, page: "1" })} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: discId === d.id || (!discId && !d.id) ? "#00754A" : "var(--color-background-primary)", color: discId === d.id || (!discId && !d.id) ? "#fff" : "var(--color-text-secondary)" }}>
              {d.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Table with Suspense boundary */}
      <Suspense fallback={<div style={{ padding: "20px", textAlign: "center", color: "var(--color-text-secondary)" }}>Cargando tabla...</div>}>
        <StudentTableSection 
          students={students} 
          pages={pages} 
          page={page} 
          pageSize={pageSize} 
          total={total} 
          buildUrl={buildUrl} 
        />
      </Suspense>
    </div>
  );
}
