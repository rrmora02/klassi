import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { AnnouncementActions } from "@/components/comunicados/announcement-actions";
import Link from "next/link";
import { Bell, Users, BookOpen, User } from "lucide-react";

interface PageProps {
  searchParams: { page?: string };
}

export default async function ComunicadosPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { clerkId: userId }, include: { activeTenant: true } });
  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Solo ADMIN y RECEPTIONIST
  const tenantUser = await db.tenantUser.findFirst({
    where: { tenantId: tenant.id, userId: user.id }
  });
  if (tenantUser?.role === "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const page     = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 10;

  const [announcements, total] = await Promise.all([
    db.announcement.findMany({
      where:   { tenantId: tenant.id },
      skip:    (page - 1) * pageSize,
      take:    pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.announcement.count({ where: { tenantId: tenant.id } }),
  ]);

  const pages      = Math.ceil(total / pageSize);
  const sentCount  = announcements.filter(a => a.sentAt).length;
  const draftCount = announcements.filter(a => !a.sentAt).length;

  function buildUrl(p: number) {
    return `/dashboard/comunicados?page=${p}`;
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingLeft: 12, paddingRight: 12 }} className="sm:px-4 lg:px-0">
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }} className="sm:flex-row sm:items-flex-start sm:justify-between">
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", margin: 0, wordBreak: "break-word" }} className="sm:text-2xl">Comunicados</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {total} {total === 1 ? "comunicado" : "comunicados"}
          </p>
        </div>
        <Link href="/dashboard/comunicados/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none", width: "100%", textAlign: "center" }} className="sm:w-auto">
          + Nuevo comunicado
        </Link>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }} className="sm:grid-cols-3 sm:gap-4">
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }} className="sm:p-5">
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }} className="sm:text-xs">Total</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#006241", margin: "4px 0 0" }} className="sm:text-2xl">{total}</p>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">comunicados</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }} className="sm:p-5">
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }} className="sm:text-xs">Enviados</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#15803d", margin: "4px 0 0" }} className="sm:text-2xl">{sentCount}</p>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">en esta página</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px", gridColumn: "1 / -1" }} className="sm:grid-column-auto sm:p-5">
          <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0 }} className="sm:text-xs">Borradores</p>
          <p style={{ fontSize: 22, fontWeight: 600, color: "#b45309", margin: "4px 0 0" }} className="sm:text-2xl">{draftCount}</p>
          <p style={{ fontSize: 10, color: "var(--color-text-tertiary)", margin: "2px 0 0" }} className="sm:text-xs">pendientes de envío</p>
        </div>
      </div>

      {/* Lista de comunicados */}
      {announcements.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "64px 0" }}>
          <Bell size={32} style={{ color: "var(--color-text-tertiary)", marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>Sin comunicados aún</p>
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "4px 0 16px" }}>Crea tu primer comunicado para notificar a los alumnos y familias</p>
          <Link href="/dashboard/comunicados/nuevo" style={{ background: "#00754A", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            + Nuevo comunicado
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {announcements.map(a => {
            const targets = a.targetGroups as string[];
            return (
              <div key={a.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "14px 16px" }} className="sm:p-5">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="sm:flex-row sm:items-flex-start sm:justify-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="sm:text-sm">
                        {a.title}
                      </h3>
                      {a.sentAt ? (
                        <span style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", borderRadius: 20, padding: "1px 6px", fontSize: 9, fontWeight: 500, whiteSpace: "nowrap" }} className="sm:text-xs">
                          Enviado
                        </span>
                      ) : (
                        <span style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderRadius: 20, padding: "1px 6px", fontSize: 9, fontWeight: 500, whiteSpace: "nowrap" }} className="sm:text-xs">
                          Borrador
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} className="sm:text-sm">
                      {a.body}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--color-text-tertiary)", flexWrap: "wrap" }} className="sm:gap-4 sm:text-xs">
                      <span>Creado {formatDate(a.createdAt)}</span>
                      {a.sentAt && <span>Enviado {formatDate(a.sentAt)}</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {a.targetAll ? (
                          <><Users size={10} /> Todos</>
                        ) : targets.length === 1 && targets[0]?.startsWith("student:") ? (
                          <><User size={10} /> Alumno</>
                        ) : (
                          <><BookOpen size={10} /> {targets.length} {targets.length === 1 ? "grupo" : "grupos"}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div style={{ width: "100%", display: "flex", justifyContent: "flex-end" }} className="sm:w-auto">
                    <AnnouncementActions id={a.id} sentAt={a.sentAt} title={a.title} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20, fontSize: 12, color: "var(--color-text-secondary)" }} className="sm:flex-row sm:justify-between sm:items-center sm:text-sm">
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
            {page > 1 && <Link href={buildUrl(page - 1)} style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", fontSize: 11 }} className="sm:text-xs">← Ant</Link>}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl(p)} style={{ padding: "5px 8px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#006241" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)", fontSize: 11 }} className="sm:text-xs">{p}</Link>
            ))}
            {page < pages && <Link href={buildUrl(page + 1)} style={{ padding: "5px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)", fontSize: 11 }} className="sm:text-xs">Sig →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
