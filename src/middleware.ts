import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isOrgSetupRoute = createRouteMatcher([
  "/onboarding(.*)",
  "/select-org(.*)",
]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) return NextResponse.next();

  const { userId, orgId } = auth();

  // Redirect unauthenticated users to sign-in
  if (!userId) {
    auth().protect();
    return;
  }

  // If the JWT already has an orgId and the user is on a setup route,
  // send them straight to the dashboard (fast path for returning users).
  // Note: after setActive() the JWT may not reflect the new org yet —
  // that case is handled client-side by OrgGuard inside the dashboard layout.
  if (orgId && isOrgSetupRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
