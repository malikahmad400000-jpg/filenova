import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refresh session tokens on incoming requests
  const { response, user, isConfigured } = await updateSession(request);

  // 1. Protected routes: /dashboard and subroutes
  if (pathname.startsWith("/dashboard")) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      if (!isConfigured) {
        loginUrl.searchParams.set("notice", "unconfigured");
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Auth routes: redirect already-logged-in users to /dashboard
  if (pathname === "/login" || pathname === "/signup") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // All other routes (/ , /tools/*, /ai/*, /api/*) remain public
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static image and model files (.svg, .png, .jpg, .traineddata)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|traineddata)$).*)",
  ],
};
