import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

// Despachador post-login: /sign-in cae aquí por defecto y cada quien va a
// su casa. Sin esto, un papá o tutor (sin membresía de escuela) aterrizaba
// en /dashboard → rebotado a /onboarding, la pantalla de "crea tu escuela".
//
// Prioridad: miembro de una escuela (staff/instructor) → dashboard;
// tutor con hijos vinculados → portal; nadie de lo anterior → onboarding
// (dueño de escuela nuevo, el flujo original).

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where:  { clerkId: userId },
    select: {
      memberships: { select: { tenantId: true }, take: 1 },
      parentOf:    { select: { studentId: true }, take: 1 },
    },
  });

  if (user && user.memberships.length > 0) redirect("/dashboard");
  if (user && user.parentOf.length > 0)    redirect("/portal");
  redirect("/onboarding");
}
