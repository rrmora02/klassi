import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { School } from "lucide-react";
import Link from "next/link";
import { canAddSchool } from "@/server/services/tenant.service";

async function createTenantAction(formData: FormData) {
  "use server";
  const { userId } = await auth();
  if (!userId) throw new Error("No autenticado");

  const schoolName     = formData.get("schoolName") as string;
  const invitationToken = formData.get("invitationToken") as string | null;

  if (!schoolName || schoolName.trim().length < 3) {
    throw new Error("El nombre de la escuela es muy corto");
  }

  // 1. Encontrar o crear usuario
  let user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client        = await clerkClient();
    const clerkUserObj  = await client.users.getUser(userId);
    const email         = clerkUserObj.emailAddresses[0]?.emailAddress ?? "no-email@klassi.io";
    const name          = [clerkUserObj.firstName, clerkUserObj.lastName].filter(Boolean).join(" ") || email;
    user = await db.user.create({
      data: { clerkId: userId, email, name, avatar: clerkUserObj.imageUrl },
    });
  }

  // 2. Determinar si es primera escuela o escuela adicional (Enterprise)
  const isAdditionalSchool = !!user.activeTenantId;
  let parentTenantId: string | null = null;
  let newPlan: "STARTER" | "ENTERPRISE" = "STARTER";

  if (isAdditionalSchool) {
    // Validar que el plan permite agregar más escuelas
    const check = await canAddSchool(user.id);
    if (!check.allowed) {
      throw new Error(check.reason ?? "No puedes agregar más escuelas con tu plan actual");
    }
    parentTenantId = user.activeTenantId;
    newPlan        = "ENTERPRISE";
  }

  // 3. Crear Tenant
  const base = schoolName.toLowerCase().trim().replace(/\s+/g, "-");
  const slug  = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const tenant = await db.tenant.create({
    data: {
      name:           schoolName.trim(),
      slug,
      plan:           newPlan,
      status:         isAdditionalSchool ? "ACTIVE" : "TRIAL",
      trialEndsAt:    isAdditionalSchool ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      parentTenantId,
      createdByUserId: user.id,
    },
  });

  // 4. Crear organización en Clerk
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.organizations.createOrganization({
      name:      schoolName.trim(),
      createdBy: userId,
    });
  } catch (error) {
    console.error("Error creating Clerk organization:", error);
  }

  // 5. Vincular usuario como ADMIN
  await db.tenantUser.create({
    data: { userId: user.id, tenantId: tenant.id, role: "ADMIN" },
  });

  // 6. Actualizar activeTenantId al nuevo tenant
  await db.user.update({
    where: { id: user.id },
    data:  { activeTenantId: tenant.id },
  });

  // El contexto tRPC cachea el usuario (TTL 10 min); invalidar para que
  // las siguientes llamadas operen sobre la escuela recién creada.
  const { invalidateUserCache } = await import("@/server/cache/userAuthCache");
  invalidateUserCache(userId);

  if (invitationToken) {
    redirect(`/aceptar-invitacion?token=${invitationToken}`);
  }

  redirect("/dashboard");
}

interface OnboardingPageProps {
  searchParams: { token?: string };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const invitationToken = searchParams.token;

  // Determinar si es una escuela adicional para ajustar el copy
  const user = await db.user.findUnique({
    where:  { clerkId: userId },
    select: { activeTenantId: true },
  });
  const isAdditionalSchool = !!user?.activeTenantId;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sb-light/50">
            <School className="h-6 w-6 text-sb-accent" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdditionalSchool ? "Agregar nueva escuela" : "Bienvenido a Klassi"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {invitationToken
              ? "Crea tu institución y luego podrás aceptar la invitación"
              : isAdditionalSchool
              ? "Ingresa el nombre de la nueva escuela. Estará activa inmediatamente bajo tu plan Enterprise."
              : "Para comenzar, necesitamos saber el nombre de tu institución deportiva o escuela."}
          </p>
        </div>

        <form action={createTenantAction} className="space-y-6">
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">
              Nombre de la Escuela
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="schoolName"
                id="schoolName"
                required
                placeholder="Ej. Academia de Artes Marciales Tigre Blanco"
                className="block w-full rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {invitationToken && (
            <input type="hidden" name="invitationToken" value={invitationToken} />
          )}

          <button
            type="submit"
            className="flex w-full justify-center rounded-xl bg-sb-accent px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sb-green focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
          >
            {isAdditionalSchool ? "Crear escuela" : "Comenzar periodo de prueba"}
          </button>
        </form>

        <Link
          href="/dashboard"
          className="mt-4 flex w-full justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
        >
          Cancelar
        </Link>

      </div>
    </main>
  );
}
