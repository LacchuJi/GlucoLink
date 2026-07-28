/**
 * CSRF protection for custom Next.js API routes.
 *
 * Better Auth handles CSRF for its own /api/auth/* endpoints.
 * This utility protects our custom POST/PUT/DELETE handlers.
 *
 * Strategy: Origin/Referer header validation.
 * The browser always sends an Origin or Referer header on cross-origin requests.
 * Legitimate same-origin requests from our frontend will match APP_URL.
 */

const ALLOWED_ORIGINS = new Set(
  [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    // Allow localhost variants in development
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
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Check Origin header first (most reliable)
  if (origin) {
    return ALLOWED_ORIGINS.has(origin);
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.has(refererOrigin);
    } catch {
      return false;
    }
  }

  // No Origin or Referer — reject in production, allow in development
  // (some tools like curl and Postman don't send these headers)
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
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
