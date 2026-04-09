import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";

export default async function SuspendidoPage() {
  const { orgId } = await auth();
  const tenant = orgId
    ? await db.tenant.findFirst({ where: { clerkOrgId: orgId }, select: { name: true, plan: true } })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <span className="text-xl text-red-600">!</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Cuenta suspendida</h1>
        <p className="mt-2 text-sm text-gray-500">
          {tenant?.name
            ? `El acceso de ${tenant.name} está suspendido por un pago pendiente.`
            : "Tu cuenta está suspendida por un pago pendiente."}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Elige un plan para reactivar tu acceso inmediatamente.
        </p>
        <Link
          href="/precios"
          className="mt-6 inline-block rounded-lg bg-blue-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
        >
          Ver planes y reactivar
        </Link>
        <p className="mt-4 text-xs text-gray-400">
          ¿Necesitas ayuda? Escríbenos a{" "}
          <a href="mailto:soporte@klassi.io" className="text-blue-600 hover:underline">
            soporte@klassi.io
          </a>
        </p>
      </div>
    </main>
  );
}
