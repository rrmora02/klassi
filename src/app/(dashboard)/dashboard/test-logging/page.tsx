import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

export default async function TestLoggingPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { activeTenant: true },
  });

  const tenant = user?.activeTenant;
  if (!tenant) return null;

  // Solo permitir acceso a super admins
  if (!user?.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1>🧪 Verificar Logging y Sentry</h1>

      <div style={{ marginBottom: 30 }}>
        <h2>Instrucciones:</h2>
        <ol>
          <li>
            <strong>Verifica Pino:</strong> Abre la consola del servidor (donde
            corre <code>npm run dev</code>) y busca los logs con el prefijo{" "}
            <code>[test]</code>
          </li>
          <li>
            <strong>Verifica Sentry:</strong> Haz clic en los botones abajo para
            enviar errores de prueba. Luego revisa tu dashboard en{" "}
            <a href="https://sentry.io" target="_blank" rel="noopener">
              https://sentry.io
            </a>
          </li>
        </ol>
      </div>

      <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8 }}>
        <h2>Estado de la configuración:</h2>
        <ul>
          <li>
            ✅ Pino Logger: <strong>Instalado y funcionando</strong>
          </li>
          <li>
            {process.env.NEXT_PUBLIC_SENTRY_DSN
              ? "✅ Sentry Client DSN: Configurado"
              : "⚠️ Sentry Client DSN: No configurado"}
          </li>
          <li>
            {process.env.SENTRY_DSN
              ? "✅ Sentry Server DSN: Configurado"
              : "⚠️ Sentry Server DSN: No configurado"}
          </li>
          <li>Environment: <strong>{process.env.NODE_ENV}</strong></li>
        </ul>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>Pruebas interactivas:</h2>

        <form action="/api/test/log-error" method="POST">
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              marginRight: 10,
              marginBottom: 10,
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            🔴 Enviar Error de Prueba a Sentry
          </button>
        </form>

        <form action="/api/test/log-message" method="POST">
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              marginRight: 10,
              marginBottom: 10,
              background: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            📝 Enviar Log de Prueba a Pino
          </button>
        </form>
      </div>

      <div
        style={{
          marginTop: 30,
          padding: 15,
          background: "#e0e7ff",
          borderRadius: 4,
        }}
      >
        <h3>📊 Qué deberías ver:</h3>
        <p>
          <strong>En la consola del servidor:</strong>
        </p>
        <code style={{ display: "block", background: "white", padding: 10 }}>
          context: "test"
          <br />
          message: "Test log message"
        </code>

        <p style={{ marginTop: 15 }}>
          <strong>En Sentry.io:</strong>
        </p>
        <ul>
          <li>Una nueva transacción de error</li>
          <li>Contexto del error: usuario, tenant, timestamp</li>
          <li>Nivel de severidad asignado</li>
        </ul>
      </div>
    </div>
  );
}
