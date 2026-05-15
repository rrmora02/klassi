export async function register() {
  if (process.env.NEXT_ENV === "server") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_ENV === "edge-runtime") {
    await import("../sentry.edge.config");
  }
}
