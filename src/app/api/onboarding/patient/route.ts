import { audit, requireUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit
    const rlKey = getRateLimitKey(request, "onboarding-patient");
    const rl = rateLimit(rlKey, RATE_LIMITS.ONBOARDING);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const user = await requireUser();

    // If already a patient, just return success (idempotent)
    if (user.role === "PATIENT") {
      const existing = await prisma.patient.findUnique({ where: { userId: user.id } });
      if (existing) {
        return Response.json({ patient: existing, role: "PATIENT" }, { status: 200 });
      }
    }

    await prisma.user.update({ where: { id: user.id }, data: { role: "PATIENT" } });
    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {}
    });
    await audit(user.id, "CREATE", "Patient", patient.id);
    return Response.json({ patient, role: "PATIENT" }, { status: 201 });
  } catch (error) {
    const isAuth = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: isAuth ? "Sign in required" : "Patient onboarding failed" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
