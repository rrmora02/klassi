import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware desactivado temporalmente (Clerk deshabilitado)
// Simplemente pasa todas las requests sin hacer nada
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
