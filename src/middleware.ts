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

  if (!userId) {
    auth().protect();
    return;
  }

  if (orgId && isOrgSetupRoute(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!orgId && !isOrgSetupRoute(request)) {
    return NextResponse.redirect(new URL("/select-org", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
