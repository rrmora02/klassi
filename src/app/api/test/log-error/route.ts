export async function POST() {
  console.log("🧪 [TEST-ERROR] Lanzando error para Sentry...");

  // Lanzar error sin capturar - Sentry lo capturará automáticamente
  throw new Error(
    "🧪 Test Error - This error should appear in Sentry dashboard. Thrown from /api/test/log-error"
  );
}


