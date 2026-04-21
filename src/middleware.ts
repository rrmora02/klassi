import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/alumno(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId } = auth();

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    auth().protect();
    return;
  }

  // La lógica de redirección a /onboarding o /dashboard ocurre a nivel
  // de Layout (Server Components), leyendo el activeTenantId de PostgreSQL.
  // Esto evita problemas de caché de cookies en middleware.
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
