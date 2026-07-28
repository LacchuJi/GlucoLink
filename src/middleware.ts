import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/sign-in", "/sign-up"];
// API routes that are always public (Better Auth handles its own auth)
const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/auth"];

// Security headers applied to every response
const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public auth API routes through (Better Auth handles these)
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Allow public pages without auth check
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Check for session cookie presence (fast edge check)
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // Redirect unauthenticated users to sign-in
    if (pathname.startsWith("/api/")) {
      // For API routes, return 401 instead of redirect
      return applySecurityHeaders(
        NextResponse.json({ error: "Authentication required" }, { status: 401 })
      );
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return applySecurityHeaders(NextResponse.redirect(signInUrl));
  }

  // Proceed — deeper role checks happen in individual API handlers / page server components
  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
