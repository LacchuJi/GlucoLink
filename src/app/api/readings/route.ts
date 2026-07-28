import { z } from "zod";
import { audit, requirePatient } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { evaluateAlerts } from "@/server/alerts/engine";
import { validateCsrfOrigin, csrfRejectionResponse } from "@/lib/csrf";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

const bodySchema = z.object({
  value: z.number().int().min(20).max(700),
  context: z.enum(["FASTING", "BEFORE_MEAL", "AFTER_MEAL", "BEDTIME", "RANDOM"]),
  source: z.enum(["MANUAL", "DEVICE_IMPORT", "WHATSAPP", "OCR", "HEALTH_CONNECT"]),
  recordedAt: z.string().datetime(),
});

function errorResponse(error: unknown) {
  const isUnauth = error instanceof Error && error.message === "UNAUTHENTICATED";
  const isForbidden = error instanceof Error && error.message === "FORBIDDEN";
  return Response.json(
    { error: isUnauth ? "Sign in required" : isForbidden ? "Access denied" : "Request failed" },
    { status: isUnauth ? 401 : isForbidden ? 403 : 500 }
  );
}

export async function GET() {
  try {
    const { patient } = await requirePatient();
    const readings = await prisma.reading.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: "desc" },
      take: 180,
    });
    return Response.json({ readings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    // CSRF check
    if (!validateCsrfOrigin(request)) return csrfRejectionResponse();

    // Rate limit: 60 readings per minute per IP
    const rlKey = getRateLimitKey(request, "readings");
    const rl = rateLimit(rlKey, RATE_LIMITS.READINGS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { user, patient } = await requirePatient();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Invalid glucose reading data" }, { status: 400 });
    }

    const reading = await prisma.reading.create({
      data: {
        patientId: patient.id,
        valueMgDl: parsed.data.value,
        context: parsed.data.context,
        source: parsed.data.source,
        recordedAt: new Date(parsed.data.recordedAt),
        verifiedAt: parsed.data.source === "DEVICE_IMPORT" ? new Date() : null,
      },
    });
    await audit(user.id, "CREATE", "Reading", reading.id);

    // Evaluate alerts asynchronously (fire and forget)
    evaluateAlerts(patient.id).catch(() => {});

    return Response.json({ reading }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
