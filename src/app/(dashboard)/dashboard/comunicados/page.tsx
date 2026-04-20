import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
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

  const page     = Math.max(1, Number(searchParams.page ?? 1));
  const pageSize = 20;

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
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Comunicados</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
            {total} {total === 1 ? "comunicado" : "comunicados"}
          </p>
        </div>
        <Link href="/dashboard/comunicados/nuevo" style={{ background: "#5b21b6", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
          + Nuevo comunicado
        </Link>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Total</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: "#5b21b6", margin: "4px 0 0" }}>{total}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>comunicados</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Enviados</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: "#15803d", margin: "4px 0 0" }}>{sentCount}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>en esta página</p>
        </div>
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>Borradores</p>
          <p style={{ fontSize: 26, fontWeight: 600, color: "#b45309", margin: "4px 0 0" }}>{draftCount}</p>
          <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "2px 0 0" }}>pendientes de envío</p>
        </div>
      </div>

      {/* Lista de comunicados */}
      {announcements.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--color-background-primary)", border: "0.5px dashed var(--color-border-tertiary)", borderRadius: 12, padding: "64px 0" }}>
          <Bell size={32} style={{ color: "var(--color-text-tertiary)", marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-text-secondary)", margin: 0 }}>Sin comunicados aún</p>
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)", margin: "4px 0 16px" }}>Crea tu primer comunicado para notificar a los alumnos y familias</p>
          <Link href="/dashboard/comunicados/nuevo" style={{ background: "#5b21b6", color: "#fff", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>
            + Nuevo comunicado
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {announcements.map(a => {
            const targets = a.targetGroups as string[];
            return (
              <div key={a.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.title}
                      </h3>
                      {a.sentAt ? (
                        <span style={{ background: "#f0fdf4", color: "#15803d", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>
                          Enviado
                        </span>
                      ) : (
                        <span style={{ background: "#fffbeb", color: "#b45309", borderRadius: 20, padding: "1px 8px", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>
                          Borrador
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {a.body}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      <span>Creado {formatDate(a.createdAt)}</span>
                      {a.sentAt && <span>Enviado {formatDate(a.sentAt)}</span>}
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {a.targetAll ? (
                          <><Users size={11} /> Todos los alumnos</>
                        ) : targets.length === 1 && targets[0]?.startsWith("student:") ? (
                          <><User size={11} /> Alumno específico</>
                        ) : (
                          <><BookOpen size={11} /> {targets.length} {targets.length === 1 ? "grupo" : "grupos"}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <AnnouncementActions id={a.id} sentAt={a.sentAt} title={a.title} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 13, color: "var(--color-text-secondary)" }}>
          <span>Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {page > 1 && <Link href={buildUrl(page - 1)} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>← Ant</Link>}
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + Math.max(1, page - 2)).filter(p => p <= pages).map(p => (
              <Link key={p} href={buildUrl(p)} style={{ padding: "5px 10px", borderRadius: 6, textDecoration: "none", border: "0.5px solid var(--color-border-secondary)", background: p === page ? "#5b21b6" : "transparent", color: p === page ? "#fff" : "var(--color-text-secondary)" }}>{p}</Link>
            ))}
            {page < pages && <Link href={buildUrl(page + 1)} style={{ padding: "5px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6, textDecoration: "none", color: "var(--color-text-secondary)" }}>Sig →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
