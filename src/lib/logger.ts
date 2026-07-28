/**
 * Sanitized server-side logger.
 *
 * In production: only logs error messages (never stack traces or full objects).
 * In development: logs full error details for debugging.
 *
 * This prevents leaking internal application structure through server logs
 * that may be captured by third-party monitoring services.
 */

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, context: string, message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;

  if (process.env.NODE_ENV === "development") {
    // Full detail in development
    if (error) {
      console[level](`${prefix} ${message}`, error);
    } else {
      console[level](`${prefix} ${message}`);
    }
  } else {
    // Production: only log safe message strings
    const safeMessage =
      error instanceof Error ? `${message}: ${error.message}` : message;
    console[level](`${prefix} ${safeMessage}`);
  }
}

export const logger = {
  info: (context: string, message: string) => log("info", context, message),
  warn: (context: string, message: string, error?: unknown) =>
    log("warn", context, message, error),
  error: (context: string, message: string, error?: unknown) =>
    log("error", context, message, error),
};
