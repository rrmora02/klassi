import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Building2, Users, BookOpen, UserCheck } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/config/plans";

export default async function EnterprisePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where:  { clerkId: userId },
    select: { id: true, activeTenantId: true },
  });
  if (!user?.activeTenantId) redirect("/onboarding");

  // Solo ADMIN con plan ENTERPRISE
  const [tenantUser, activeTenant] = await Promise.all([
    db.tenantUser.findFirst({ where: { userId: user.id, tenantId: user.activeTenantId } }),
    db.tenant.findUnique({ where: { id: user.activeTenantId }, select: { plan: true } }),
  ]);

  if (tenantUser?.role !== "ADMIN" || activeTenant?.plan !== "ENTERPRISE") {
    redirect("/dashboard");
  }

  // Obtener todas las escuelas creadas por este usuario
  const schools = await db.tenant.findMany({
    where:   { createdByUserId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, slug: true, status: true, createdAt: true,
      _count: {
        select: {
          students:    { where: { status: "ACTIVE" } },
          groups:      { where: { isActive: true } },
          instructors: { where: { isActive: true } },
        },
      },
    },
  });

  const limit = PLANS.ENTERPRISE.schools;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mis escuelas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona todas tus instituciones bajo el plan Enterprise.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {schools.length} / {limit} escuelas
          </span>
          {schools.length < limit && (
            <Link
              href="/onboarding"
              className="px-4 py-2 rounded-lg bg-sb-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Agregar escuela
            </Link>
          )}
        </div>
      </div>

      {/* Barra de capacidad */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-sb-accent transition-all"
            style={{ width: `${(schools.length / limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Lista de escuelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schools.map(school => (
          <div
            key={school.id}
            className="bg-white dark:bg-sb-house rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.10)] p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-sb-accent/10 dark:bg-sb-accent/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-sb-accent" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{school.name}</p>
                  <p className="text-xs text-gray-400">{school.slug}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                school.status === "ACTIVE"
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : school.status === "TRIAL"
                  ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
              }`}>
                {school.status === "ACTIVE" ? "Activa" : school.status === "TRIAL" ? "Trial" : school.status}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-[rgba(255,255,255,0.07)]">
              <div className="flex flex-col items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{school._count.students}</p>
                <p className="text-xs text-gray-400">Alumnos</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{school._count.groups}</p>
                <p className="text-xs text-gray-400">Grupos</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <UserCheck className="h-4 w-4 text-gray-400" />
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{school._count.instructors}</p>
                <p className="text-xs text-gray-400">Instructores</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aún no tienes escuelas registradas.</p>
        </div>
      )}
    </div>
  );
}
