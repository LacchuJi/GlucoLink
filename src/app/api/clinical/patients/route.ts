import { requireDoctor, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, getRateLimitKey, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

const assignPatientSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function GET(request: Request) {
  try {
    // Strict: only verified doctors can see the patient list
    const { doctor } = await requireDoctor();

    const assignments = await prisma.careAssignment.findMany({
      where: { doctorId: doctor.id },
      include: {
        patient: {
          include: {
            user: true,
            readings: {
              where: {
                recordedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
              },
              orderBy: { recordedAt: "desc" }
            }
          }
        }
      }
    });

    const snapshots = assignments.map((assignment) => {
      const p = assignment.patient;
      const u = p.user;
      const readings = p.readings;

      const initials = (u.name || "Unknown Patient")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const lastReading = readings.length > 0 ? readings[0].valueMgDl : 0;
      const lastLoggedHoursAgo =
        readings.length > 0
          ? Math.floor((Date.now() - readings[0].recordedAt.getTime()) / (1000 * 60 * 60))
          : 999;
      const lowEvents7d = readings.filter(
        (r) =>
          r.valueMgDl < 70 && r.recordedAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length;
      const timeInRange =
        readings.length > 0
          ? Math.round(
              (readings.filter((r) => r.valueMgDl >= 70 && r.valueMgDl <= 180).length /
                readings.length) *
                100
            )
          : 0;
      const average =
        readings.length > 0
          ? Math.round(readings.reduce((sum, r) => sum + r.valueMgDl, 0) / readings.length)
          : 0;
      const a1c = average > 0 ? parseFloat(((average + 46.7) / 28.7).toFixed(1)) : 0;

      return {
        id: p.id,
        name: u.name,
        initials,
        age: 50,
        a1c,
        timeInRange,
        average,
        lastReading,
        lastLoggedHoursAgo,
        unreadMessages: 0,
        lowEvents7d,
        trendPct14d: 0,
      };
    });

    await audit(doctor.userId, "READ", "PatientList");

    return Response.json({ patients: snapshots, organization: null });
  } catch (error) {
    const isAuth =
      error instanceof Error &&
      (error.message === "UNAUTHENTICATED" ||
        error.message === "FORBIDDEN" ||
        error.message === "DOCTOR_PROFILE_MISSING");
    return Response.json(
      { error: isAuth ? "Access denied" : "Failed to load patient list" },
      { status: isAuth ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit: 20 patient assignments per minute per IP
    const rlKey = getRateLimitKey(request, "patients");
    const rl = rateLimit(rlKey, RATE_LIMITS.PATIENTS);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    // Strict: only verified doctors can assign patients
    const { doctor } = await requireDoctor();

    const body = await request.json();
    const parsed = assignPatientSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { email } = parsed.data;

    const userToAssign = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });

    if (!userToAssign) {
      return Response.json(
        { error: `No account found for that email. The patient must sign up first.` },
        { status: 404 }
      );
    }

    // Ensure patient profile exists
    let patient = await prisma.patient.findUnique({ where: { userId: userToAssign.id } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { userId: userToAssign.id } });
    }

    // Create assignment
    await prisma.careAssignment.upsert({
      where: { doctorId_patientId: { doctorId: doctor.id, patientId: patient.id } },
      update: {},
      create: { doctorId: doctor.id, patientId: patient.id },
    });

    await audit(doctor.userId, "CREATE", "CareAssignment", patient.id);

    return Response.json({ success: true });
  } catch (error) {
    const isAuth =
      error instanceof Error &&
      (error.message === "UNAUTHENTICATED" ||
        error.message === "FORBIDDEN" ||
        error.message === "DOCTOR_PROFILE_MISSING");
    return Response.json(
      { error: isAuth ? "Access denied" : "Failed to assign patient" },
      { status: isAuth ? 403 : 500 }
    );
  }
}
