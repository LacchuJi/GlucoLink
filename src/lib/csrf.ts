/**
 * CSRF protection for custom Next.js API routes.
 *
 * Better Auth handles CSRF for its own /api/auth/* endpoints.
 * This utility protects our custom POST/PUT/DELETE handlers.
 *
 * Strategy: Same-Origin validation via Host and Origin/Referer headers.
 */

const ALLOWED_ORIGINS = new Set(
  [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://127.0.0.1:3000"]
      : []),
  ].filter(Boolean) as string[]
);

/**
 * Validates that a state-changing request comes from our own origin.
 * Returns `true` if the request is safe to process.
 */
export function validateCsrfOrigin(request: Request): boolean {
  const host = request.headers.get("host");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Dynamic Same-Origin check against the incoming host header
  if (host) {
    const httpHostOrigin = `http://${host}`;
    const httpsHostOrigin = `https://${host}`;

    if (origin && (origin === httpHostOrigin || origin === httpsHostOrigin || ALLOWED_ORIGINS.has(origin))) {
      return true;
    }

    if (referer) {
      try {
        const refOrigin = new URL(referer).origin;
        if (refOrigin === httpHostOrigin || refOrigin === httpsHostOrigin || ALLOWED_ORIGINS.has(refOrigin)) {
          return true;
        }
      } catch {
        // Continue fallback
      }
    }
  }

  // Fallback check against static ALLOWED_ORIGINS
  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  if (referer) {
    try {
      if (ALLOWED_ORIGINS.has(new URL(referer).origin)) return true;
    } catch {
      // Ignore invalid referer syntax
    }
  }

  // Allow requests without origin/referer in development mode (curl/postman/same-origin navigation)
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return false;
}

/**
 * Returns a 403 CSRF rejection response.
 */
export function csrfRejectionResponse(): Response {
  return Response.json(
    { error: "Invalid request origin" },
    { status: 403 }
  );
}
