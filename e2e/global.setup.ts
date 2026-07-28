import { clerkSetup } from "@clerk/testing/playwright";

// Obtiene un "testing token" de Clerk (evita la protección anti-bots en la
// instancia de desarrollo). Requiere NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY y
// CLERK_SECRET_KEY en el entorno (los mismos de tu .env de desarrollo).
// Sin ellos, solo corren las pruebas smoke (sin autenticación).

export default async function globalSetup() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn(
      "[e2e] CLERK_SECRET_KEY no definido: solo correrán las pruebas sin autenticación (smoke).",
    );
    return;
  }
  await clerkSetup();
}
