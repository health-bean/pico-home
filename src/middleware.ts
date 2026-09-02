import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error("[Middleware Error]", request.nextUrl.pathname, error);
    // API callers need a machine-readable error, not an HTML redirect —
    // and a transient auth-provider outage should read as 503, not logout.
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503 }
      );
    }
    // Pages: redirect to landing — don't let unauthenticated requests through
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|robots.txt|sitemap.xml|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
