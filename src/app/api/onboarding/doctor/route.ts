import { requireUser, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

const doctorOnboardSchema = z.object({
  clinicName: z.string().min(2).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    // Rate limit
    const rlKey = getRateLimitKey(request, "onboarding-doctor");
    const rl = rateLimit(rlKey, RATE_LIMITS.ONBOARDING);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const user = await requireUser();

    // Prevent role escalation: only users who just registered can onboard
    // (account must be < 10 minutes old)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const TEN_MINUTES = 10 * 60 * 1000;
    if (user.role === "PATIENT" && accountAge > TEN_MINUTES) {
      return Response.json(
        { error: "Onboarding window has expired. Please contact support." },
        { status: 403 }
      );
    }

    // If already a doctor, just return success (idempotent)
    if (user.role === "DOCTOR") {
      const existingDoctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
      if (existingDoctor) {
        return Response.json({ success: true, doctorId: existingDoctor.id, role: "DOCTOR" });
      }
    }

    let clinicName = "GlucoLink Care Clinic";
    try {
      const body = await request.json();
      const parsed = doctorOnboardSchema.safeParse(body);
      if (parsed.success && parsed.data.clinicName?.trim()) {
        clinicName = parsed.data.clinicName.trim();
      }
    } catch {
      // Body is optional
    }

    const org = await prisma.organization.create({ data: { name: clinicName } });

    await prisma.user.update({ where: { id: user.id }, data: { role: "DOCTOR" } });

    let doctor = await prisma.doctor.findUnique({ where: { userId: user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: { userId: user.id, organizationId: org.id }
      });
    }

    await audit(user.id, "CREATE", "Doctor", doctor.id);

    return Response.json({ success: true, doctorId: doctor.id, role: "DOCTOR" });
  } catch (error) {
    const isAuth = error instanceof Error && error.message === "UNAUTHENTICATED";
    return Response.json(
      { error: isAuth ? "Sign in required" : "Doctor onboarding failed" },
      { status: isAuth ? 401 : 500 }
    );
  }
}
